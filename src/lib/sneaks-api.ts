import { createServerFn } from '@tanstack/react-start'
import { createRequire } from 'module'
import type { KicksDBProduct } from '../types/inventory'

const require = createRequire(import.meta.url)

// Note: We're using KicksDBProduct type for compatibility, but this is actually Sneaks API data

/**
 * Searches for sneakers using Sneaks API (free, no API key required)
 */
export const searchSneaksAPI = createServerFn({
  method: 'GET',
}).handler(
  async ({
    query,
  }: {
    query: string
  }): Promise<{ products: KicksDBProduct[]; cached: boolean }> => {
    return searchSneaksAPIServer(query)
  }
)

/**
 * Direct server-side search function (for use in server-side code)
 */
export async function searchSneaksAPIServer(
  query: string
): Promise<{ products: KicksDBProduct[]; cached: boolean }> {
  try {
    // Import sneaks-api (CommonJS module) using createRequire
    const SneaksAPI = require('sneaks-api')
    
    // Initialize Sneaks API
    const sneaks = new SneaksAPI()

    // Search for products (limit to 10 results) with timeout
    return new Promise((resolve) => {
      // Set a timeout to prevent hanging
      const timeout = setTimeout(() => {
        console.warn(`Sneaks API: Timeout for query: ${query}`)
        resolve({ products: [], cached: false })
      }, 10000) // 10 second timeout

      sneaks.getProducts(query, 10, (err: Error | null, products: any[]) => {
        clearTimeout(timeout)
        
        if (err) {
          // Handle specific error types gracefully
          const errorMessage = err.message || String(err)
          
          // 530 errors are Cloudflare blocking - sites might be down
          if (errorMessage.includes('530') || errorMessage.includes('ERR_NON_2XX_3XX_RESPONSE')) {
            // Silently handle - this is expected when sites are blocked
            resolve({ products: [], cached: false })
            return
          }
          
          // Other errors - log but don't crash
          console.warn(`Sneaks API error for "${query}":`, errorMessage.substring(0, 100))
          resolve({ products: [], cached: false })
          return
        }

        if (!products || products.length === 0) {
          resolve({ products: [], cached: false })
          return
        }

        try {
          // Convert Sneaks API format to our KicksDBProduct format
          const convertedProducts: KicksDBProduct[] = products
            .filter((product) => product != null) // Filter out null/undefined
            .map((product) => {
              // Safely extract values, ensuring strings
              const name = String(product.shoeName || product.name || '')
              const brand = String(product.brand || '')
              const model = String(product.model || '')
              const colorway = String(product.colorway || '')
              const imageUrl = String(product.thumbnail || product.image || product.media?.imageUrl || '')
              
              return {
                id: String(product.styleID || product._id || product.shoeName || ''),
                name,
                brand,
                model,
                colorway,
                imageUrl: imageUrl || undefined,
                images: imageUrl ? [imageUrl] : [],
                retailPrice: typeof product.retailPrice === 'number' ? product.retailPrice : typeof product.retail === 'number' ? product.retail : undefined,
                releaseDate: product.releaseDate || product.release || undefined,
              }
            })
            .filter((product) => product.name) // Filter out products with no name

          resolve({ products: convertedProducts, cached: false })
        } catch (conversionError) {
          // Handle conversion errors gracefully
          console.warn(`Sneaks API: Error converting products for "${query}":`, conversionError)
          resolve({ products: [], cached: false })
        }
      })
    })
  } catch (error) {
    // Catch any initialization or other errors
    const errorMessage = error instanceof Error ? error.message : String(error)
    // Only log non-530 errors to avoid spam
    if (!errorMessage.includes('530')) {
      console.warn(`Sneaks API: Error initializing for "${query}":`, errorMessage.substring(0, 100))
    }
    return { products: [], cached: false }
  }
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
    // Safely convert to strings and lowercase
    const productName = String(product.name || '').toLowerCase()
    const productBrand = String(product.brand || '').toLowerCase()
    const productModel = String(product.model || '').toLowerCase()

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

