import { createServerFn } from '@tanstack/react-start'
import type { KicksDBProduct, KicksDBSearchResponse } from '../types/inventory'

const KICKSDB_API_BASE_URL = 'https://api.kicks.dev'

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
 * Free alternative: Get image URL using free services (no API key required)
 * Falls back gracefully if no images are found
 */
async function getFreeImageUrl(query: string): Promise<string | null> {
  try {
    // Option 1: Try Unsplash API if key is provided (free tier: 50 requests/hour)
    const UNSPLASH_ACCESS_KEY = getEnv('UNSPLASH_ACCESS_KEY')
    
    if (UNSPLASH_ACCESS_KEY) {
      try {
        const unsplashUrl = `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query + ' sneakers shoes')}&per_page=1&client_id=${UNSPLASH_ACCESS_KEY}`
        const response = await fetch(unsplashUrl)
        
        if (response.ok) {
          const data = await response.json()
          if (data.results && data.results.length > 0) {
            return data.results[0].urls?.regular || data.results[0].urls?.small || null
          }
        }
      } catch (err) {
        console.warn('Unsplash API error:', err)
      }
    }
    
    // Option 2: Use Pexels API if key is provided (free tier: 200 requests/hour)
    const PEXELS_API_KEY = getEnv('PEXELS_API_KEY')
    
    if (PEXELS_API_KEY) {
      try {
        const pexelsUrl = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query + ' sneakers')}&per_page=1`
        const response = await fetch(pexelsUrl, {
          headers: {
            Authorization: PEXELS_API_KEY,
          },
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.photos && data.photos.length > 0) {
            return data.photos[0].src?.large || data.photos[0].src?.medium || null
          }
        }
      } catch (err) {
        console.warn('Pexels API error:', err)
      }
    }
    
    // If no free API keys are configured, return null
    // The UI will show a placeholder image instead
    return null
  } catch (error) {
    console.error('Error getting free image URL:', error)
    return null
  }
}

// Simple in-memory cache to minimize API calls (respects rate limits)
const searchCache = new Map<string, { data: KicksDBProduct[]; timestamp: number }>()
const CACHE_TTL = 1000 * 60 * 60 * 24 // 24 hours

/**
 * Internal function to search KicksDB (can be called server-side)
 */
async function searchKicksDBInternal(
  query: string
): Promise<{ products: KicksDBProduct[]; cached: boolean }> {
    const KICKSDB_API_KEY = getEnv('KICKSDB_API_KEY')
    
    if (!KICKSDB_API_KEY) {
      console.warn('KICKSDB_API_KEY not set, returning empty results')
      return { products: [], cached: false }
    }

    // Check cache first
    const cacheKey = query.toLowerCase().trim()
    const cached = searchCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return { products: cached.data, cached: true }
    }

    try {
      // According to KicksDB docs: Authorization header should be just the API key (no "Bearer" prefix)
      // Free tier only supports individual providers like StockX (not general search/GTIN)
      // API key format: KICKS-BCFE-71C9-B7D0-64CC154JSR05
      const endpoints = [
        // Try StockX search endpoint (free tier supports individual providers)
        {
          url: `${KICKSDB_API_BASE_URL}/api/v3/stockx/products/search?q=${encodeURIComponent(query)}`,
          headers: {
            Authorization: KICKSDB_API_KEY, // No "Bearer" prefix per docs
            'Content-Type': 'application/json',
          },
        },
        // Try StockX search with different query param
        {
          url: `${KICKSDB_API_BASE_URL}/api/v3/stockx/products/search?query=${encodeURIComponent(query)}`,
          headers: {
            Authorization: KICKSDB_API_KEY,
            'Content-Type': 'application/json',
          },
        },
        // Try StockX search with term param
        {
          url: `${KICKSDB_API_BASE_URL}/api/v3/stockx/products/search?term=${encodeURIComponent(query)}`,
          headers: {
            Authorization: KICKSDB_API_KEY,
            'Content-Type': 'application/json',
          },
        },
        // Try v2 StockX search
        {
          url: `${KICKSDB_API_BASE_URL}/api/v2/stockx/products/search?q=${encodeURIComponent(query)}`,
          headers: {
            Authorization: KICKSDB_API_KEY,
            'Content-Type': 'application/json',
          },
        },
        // Try v1 StockX search
        {
          url: `${KICKSDB_API_BASE_URL}/api/v1/stockx/products/search?q=${encodeURIComponent(query)}`,
          headers: {
            Authorization: KICKSDB_API_KEY,
            'Content-Type': 'application/json',
          },
        },
      ]

      let lastError: string | null = null

      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint.url, {
            method: 'GET',
            headers: endpoint.headers,
          })

          if (response.ok) {
            const data = (await response.json()) as KicksDBSearchResponse
            const products = extractProducts(data)
            searchCache.set(cacheKey, { data: products, timestamp: Date.now() })
            return { products, cached: false }
          }

          // If 403, try next endpoint
          if (response.status === 403) {
            const errorText = await response.text()
            lastError = `${response.status}: ${errorText}`
            continue // Try next endpoint
          }

          // For other errors, log and continue
          if (response.status !== 404) {
            const errorText = await response.text()
            lastError = `${response.status}: ${errorText}`
            continue
          }
        } catch (err) {
          // Network error, try next endpoint
          continue
        }
      }

      // If all endpoints failed, try free alternative
      if (lastError) {
        console.warn(`KicksDB API: All endpoints failed. Last error: ${lastError}`)
        // Return cached data if available
        if (cached) {
          return { products: cached.data, cached: true }
        }
        
        // Try free alternative: create a mock product with a search-based image URL
        // This allows the system to work even without KicksDB
        const freeImageUrl = await getFreeImageUrl(query)
        if (freeImageUrl) {
          const mockProduct: KicksDBProduct = {
            name: query,
            imageUrl: freeImageUrl,
            images: [freeImageUrl],
          }
          return { products: [mockProduct], cached: false }
        }
        
        return { products: [], cached: false }
      }

      // If we get here, all endpoints were tried but none worked
      return { products: [], cached: false }
    } catch (error) {
      console.error('Error searching KicksDB:', error)
      // Return cached data if available
      if (cached) {
        return { products: cached.data, cached: true }
      }
      return { products: [], cached: false }
    }
}

/**
 * Searches KicksDB for shoes matching the query (server function wrapper)
 */
export const searchKicksDB = createServerFn({
  method: 'GET',
}).handler(
  async ({
    query,
  }: {
    query: string
  }): Promise<{ products: KicksDBProduct[]; cached: boolean }> => {
    return searchKicksDBInternal(query)
  }
)

/**
 * Direct server-side search function (for use in server-side code)
 */
export async function searchKicksDBServer(
  query: string
): Promise<{ products: KicksDBProduct[]; cached: boolean }> {
  return searchKicksDBInternal(query)
}

/**
 * Extracts products from KicksDB API response
 * Handles different response structures
 */
function extractProducts(data: KicksDBSearchResponse): KicksDBProduct[] {
  // Handle different response structures
  if (Array.isArray(data)) {
    return data as KicksDBProduct[]
  }

  if (data.products && Array.isArray(data.products)) {
    return data.products
  }

  if (data.data && Array.isArray(data.data)) {
    return data.data as KicksDBProduct[]
  }

  if (data.results && Array.isArray(data.results)) {
    return data.results as KicksDBProduct[]
  }

  return []
}

/**
 * Finds the best matching product from search results
 */
export function findBestMatch(
  searchQuery: string,
  products: KicksDBProduct[]
): KicksDBProduct | null {
  if (products.length === 0) {
    return null
  }

  if (products.length === 1) {
    return products[0]
  }

  // Simple matching: prefer products with matching brand/model in name
  const queryLower = searchQuery.toLowerCase()
  const queryWords = queryLower.split(/\s+/).filter(Boolean)

  // Score products based on how many query words match
  const scored = products.map((product) => {
    const productName = (product.name || '').toLowerCase()
    const productBrand = (product.brand || '').toLowerCase()
    const productModel = (product.model || '').toLowerCase()

    let score = 0
    for (const word of queryWords) {
      if (productName.includes(word)) score += 2
      if (productBrand.includes(word)) score += 3
      if (productModel.includes(word)) score += 3
    }

    // Prefer products with images
    if (product.imageUrl || (product.images && product.images.length > 0)) {
      score += 5
    }

    return { product, score }
  })

  // Sort by score and return the best match
  scored.sort((a, b) => b.score - a.score)
  return scored[0].product
}

