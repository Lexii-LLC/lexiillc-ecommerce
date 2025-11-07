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
 * Internal function to fetch Clover inventory (can be called server-side)
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

  const url = `${CLOVER_API_BASE_URL}/v3/merchants/${CLOVER_MERCHANT_ID}/items`

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${CLOVER_API_TOKEN}`,
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

    // Clover API returns items in a 'elements' array
    if (data.elements && Array.isArray(data.elements)) {
      return data.elements as CloverItem[]
    }

    // Fallback: if it's already an array
    if (Array.isArray(data)) {
      return data as CloverItem[]
    }

    // If no items found, return empty array
    return []
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

