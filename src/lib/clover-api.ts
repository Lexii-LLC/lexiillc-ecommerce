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
 * Internal function to fetch a single page of Clover inventory
 */
async function fetchCloverInventoryPage(
  url: string,
  token: string
): Promise<{ items: CloverItem[]; nextUrl: string | null }> {
  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  })

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

  const data = await response.json()

  // Clover API returns items in a 'elements' array with pagination info
  let items: CloverItem[] = []
  let nextUrl: string | null = null

  if (data.elements && Array.isArray(data.elements)) {
    items = data.elements as CloverItem[]
    // Check for next page URL in the response
    if (data.href && typeof data.href === 'string') {
      nextUrl = data.href
    }
  } else if (Array.isArray(data)) {
    // Fallback: if it's already an array
    items = data as CloverItem[]
  }

  return { items, nextUrl }
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

  // Start with the initial URL - Clover API typically supports limit parameter
  // Using limit=1000 to get as many items as possible per page
  const initialUrl = `${CLOVER_API_BASE_URL}/v3/merchants/${CLOVER_MERCHANT_ID}/items?limit=1000`

  try {
    const allItems: CloverItem[] = []
    let currentUrl: string | null = initialUrl
    let pageCount = 0
    const maxPages = 100 // Safety limit to prevent infinite loops

    // Fetch all pages
    while (currentUrl && pageCount < maxPages) {
      const { items, nextUrl } = await fetchCloverInventoryPage(currentUrl, CLOVER_API_TOKEN)
      allItems.push(...items)
      
      // If we got fewer items than the limit, we're on the last page
      if (items.length < 1000) {
        break
      }

      currentUrl = nextUrl
      pageCount++

      // Small delay between pages to avoid rate limiting
      if (currentUrl && pageCount < maxPages) {
        await new Promise((resolve) => setTimeout(resolve, 100))
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

