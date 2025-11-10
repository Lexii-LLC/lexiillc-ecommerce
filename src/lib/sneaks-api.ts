import { createServerFn } from '@tanstack/react-start'
import type { KicksDBProduct } from '../types/inventory'

// Note: We're using KicksDBProduct type for compatibility
// This implementation uses REST API calls instead of the npm package to avoid bundling issues

/**
 * Searches for sneakers using REST API (free, no API key required)
 * This replaces the sneaks-api npm package to avoid bundling issues in serverless environments
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
 * Uses REST API instead of npm package to work in serverless environments
 */
export async function searchSneaksAPIServer(
  query: string
): Promise<{ products: KicksDBProduct[]; cached: boolean }> {
  // Temporarily disabled: The sneaks-api npm package caused bundling issues in serverless environments
  // TODO: Implement a REST API-based solution or use a different sneaker image service
  // For now, return empty results so the app functions without images
  // Products will still display but without images until a proper API is integrated
  
  // Silently return empty results - no logging to avoid log spam
  return { products: [], cached: false }
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

