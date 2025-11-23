import { createServerFn } from '@tanstack/react-start'
import type { CloverItem } from '../types/inventory'

/**
 * Get environment variable (works in both server and client contexts)
 */
function getEnv(key: string): string | undefined {
  // Server-side: use process.env
  if (typeof process !== 'undefined' && process.env) {
    return process.env[key]
  }
  // Client-side: use import.meta.env
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env[key]
  }
  return undefined
}

/**
 * Verify Clover API connection by testing merchant endpoint
 */
async function verifyCloverConnection(
  baseUrl: string,
  token: string,
  merchantId: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    const testUrl = `${baseUrl}/v3/merchants/${merchantId}`
    const response = await fetch(testUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })

    if (response.ok) {
      return { valid: true }
    } else {
      const errorText = await response.text()
      return { valid: false, error: `${response.status}: ${errorText}` }
    }
  } catch (error) {
    return {
      valid: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}

/**
 * Sleep utility with jitter to avoid thundering herd
 */
async function sleep(ms: number): Promise<void> {
  // Add small random jitter (±20%) to avoid synchronized requests
  const jitter = ms * 0.2 * (Math.random() * 2 - 1)
  await new Promise((resolve) => setTimeout(resolve, ms + jitter))
}

/**
 * Internal function to fetch a single page of Clover inventory with retry logic
 */
async function fetchCloverInventoryPage(
  url: string,
  token: string,
  retryCount = 0,
  maxRetries = 3
): Promise<CloverItem[]> {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

  // Check rate limit headers if available (for monitoring)
  const rateLimitRemaining = response.headers.get('X-RateLimit-Remaining')
  const rateLimitReset = response.headers.get('X-RateLimit-Reset')
  if (rateLimitRemaining && parseInt(rateLimitRemaining, 10) < 10) {
    console.warn(
      `Rate limit remaining: ${rateLimitRemaining}. Reset at: ${rateLimitReset || 'unknown'}`
    )
  }

  // Handle rate limiting (429 Too Many Requests) and transient errors
  if (response.status === 429 || response.status === 503 || response.status === 502) {
    const retryAfter = response.headers.get('Retry-After')
    let waitTime = 1000 // Default 1 second
    
    if (retryAfter) {
      // Retry-After can be seconds (number) or HTTP date
      const retryAfterNum = parseInt(retryAfter, 10)
      if (!isNaN(retryAfterNum)) {
        waitTime = retryAfterNum * 1000
      }
    } else {
      // Exponential backoff: 1s, 2s, 4s, 8s
      waitTime = Math.min(1000 * Math.pow(2, retryCount), 8000)
    }

    if (retryCount < maxRetries) {
      const statusText = response.status === 429 ? 'Rate limited' : `Server error (${response.status})`
      console.warn(
        `${statusText}. Retrying after ${waitTime}ms (attempt ${retryCount + 1}/${maxRetries})`
      )
      await sleep(waitTime)
      return fetchCloverInventoryPage(url, token, retryCount + 1, maxRetries)
    } else {
      const errorType = response.status === 429 ? 'Rate limited' : `Server error (${response.status})`
      throw new Error(
        `${errorType} after ${maxRetries} retries. Please wait before making more requests.`
      )
    }
  }

  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage = `Clover API error: ${response.status} ${response.statusText}`
    
    if (response.status === 401) {
      errorMessage += '\n\n401 Unauthorized - Possible causes:'
      errorMessage += '\n- Invalid or expired API token'
      errorMessage += '\n- Incorrect merchant ID'
      errorMessage += '\n- Token lacks required permissions'
      errorMessage += '\n- Using sandbox token in production (or vice versa)'
      errorMessage += '\n\nPlease verify:'
      errorMessage += '\n1. Your API token is valid and not expired'
      errorMessage += '\n2. Your merchant ID is correct'
      errorMessage += '\n3. Token has "inventory" or "items" read permissions'
      errorMessage += '\n4. You\'re using the correct environment (sandbox vs production)'
    }
    
    if (errorText) {
      errorMessage += `\n\nAPI Response: ${errorText}`
    }
    
    throw new Error(errorMessage)
  }

  // Check if response has content before parsing
  const responseText = await response.text()
  if (!responseText || responseText.trim().length === 0) {
    console.warn('Empty response from Clover API, returning empty array')
    return { items: [], nextUrl: null }
  }

  let data
  try {
    data = JSON.parse(responseText)
  } catch (parseError) {
    console.error('Failed to parse Clover API response as JSON:', parseError)
    console.error('Response text:', responseText.substring(0, 200))
    throw new Error(`Invalid JSON response from Clover API: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`)
  }

  // Clover API returns items in a 'elements' array
  let items: CloverItem[] = []

  if (data.elements && Array.isArray(data.elements)) {
    items = data.elements as CloverItem[]
  } else if (Array.isArray(data)) {
    // Fallback: if it's already an array
    items = data as CloverItem[]
  }

  return items
}

/**
 * Internal function to fetch Clover inventory with pagination support
 */
async function fetchCloverInventoryInternal(): Promise<CloverItem[]> {
  const CLOVER_API_BASE_URL = getEnv('CLOVER_API_BASE_URL') || 'https://api.clover.com'
  const CLOVER_API_TOKEN = getEnv('CLOVER_API_TOKEN')
  const CLOVER_MERCHANT_ID = getEnv('CLOVER_MERCHANT_ID')

  if (!CLOVER_API_TOKEN) {
    throw new Error('CLOVER_API_TOKEN environment variable is not set')
  }

  if (!CLOVER_MERCHANT_ID) {
    throw new Error('CLOVER_MERCHANT_ID environment variable is not set')
  }

  // First, verify the connection works
  const verification = await verifyCloverConnection(
    CLOVER_API_BASE_URL,
    CLOVER_API_TOKEN,
    CLOVER_MERCHANT_ID
  )

  if (!verification.valid) {
    throw new Error(
      `Clover API authentication failed. Cannot verify merchant connection: ${verification.error}\n\n` +
        `Please check:\n` +
        `1. API token is valid and matches the environment (${CLOVER_API_BASE_URL.includes('sandbox') ? 'sandbox' : 'production'})\n` +
        `2. Merchant ID is correct\n` +
        `3. Token has proper permissions\n` +
        `4. Token hasn't expired`
    )
  }

  // Clover API uses offset/limit pagination (max 1000 items per request)
  // We'll fetch in batches of 1000 using offset parameter
  const limit = 1000
  const baseUrl = `${CLOVER_API_BASE_URL}/v3/merchants/${CLOVER_MERCHANT_ID}/items`

  try {
    const allItems: CloverItem[] = []
    let offset = 0
    let pageCount = 0
    const maxPages = 10 // Safety limit (10 * 1000 = 10,000 items max)

    // Fetch all pages using offset pagination
    while (pageCount < maxPages) {
      const url = `${baseUrl}?limit=${limit}&offset=${offset}`
      
      try {
        const items = await fetchCloverInventoryPage(url, CLOVER_API_TOKEN)
        allItems.push(...items)
        
        // If we got fewer items than the limit, we've reached the end
        if (items.length < limit) {
          console.log(`Reached end of inventory at offset ${offset}`)
          break
        }
        
        // If we got exactly the limit, there might be more items
        offset += limit
        pageCount++

        // Delay between pages to avoid rate limiting
        // Using 500ms base delay with jitter to be more conservative
        if (pageCount < maxPages) {
          await sleep(500)
        }
      } catch (pageError) {
        // If first page fails, try without limit/offset to see if API supports it differently
        if (pageCount === 0) {
          console.warn('Initial paginated request failed, trying without pagination parameters')
          try {
            const items = await fetchCloverInventoryPage(baseUrl, CLOVER_API_TOKEN)
            console.log(`Fetched ${items.length} items without pagination`)
            return items
          } catch (fallbackError) {
            throw pageError // Throw original error if fallback also fails
          }
        }
        throw pageError
      }
    }

    if (pageCount >= maxPages) {
      console.warn(`Reached maximum page limit (${maxPages}). Some items may be missing.`)
    }

    console.log(`Fetched ${allItems.length} items from Clover API across ${pageCount + 1} page(s)`)
    return allItems
  } catch (error) {
    console.error('Error fetching Clover inventory:', error)
    throw error
  }
}

/**
 * Fetches inventory items from Clover POS API (server function wrapper)
 */
export const fetchCloverInventory = createServerFn({
  method: 'GET',
}).handler(async (): Promise<CloverItem[]> => {
  return fetchCloverInventoryInternal()
})

/**
 * Direct server-side fetch function (for use in server-side code)
 */
export async function fetchCloverInventoryServer(): Promise<CloverItem[]> {
  return fetchCloverInventoryInternal()
}

