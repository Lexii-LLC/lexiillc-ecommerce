import { fetchCloverInventoryServer } from './clover-api'
import { searchSneaksAPIServer, findBestMatch } from './sneaks-api'
import { parseShoeName } from './shoe-parser'
import type { EnrichedInventoryItem } from '../types/inventory'

/**
 * Main service that orchestrates Clover fetch, parsing, and Sneaks API lookup
 */
export async function getEnrichedInventory(): Promise<EnrichedInventoryItem[]> {
  try {
    // Fetch inventory from Clover
    const cloverItems = await fetchCloverInventoryServer()

    // Process items in batches to enrich with images (with graceful error handling)
    const enrichedItems: EnrichedInventoryItem[] = []
    const batchSize = 10
    
    for (let i = 0; i < cloverItems.length; i += batchSize) {
      const batch = cloverItems.slice(i, i + batchSize)
      const batchPromises = batch.map(async (item) => {
        try {
          return await enrichInventoryItem(item)
        } catch (error) {
          // Gracefully handle any errors - return item without enrichment
          // Errors are already logged in the enrichInventoryItem function
          return createFallbackItem(item)
        }
      })

      const batchResults = await Promise.all(batchPromises)
      enrichedItems.push(...batchResults)

      // Small delay between batches to avoid overwhelming the API
      if (i + batchSize < cloverItems.length) {
        await new Promise((resolve) => setTimeout(resolve, 200))
      }
    }

    return enrichedItems
  } catch (error) {
    console.error('Error getting enriched inventory:', error)
    throw error
  }
}

/**
 * Enriches a single inventory item with KicksDB data
 */
async function enrichInventoryItem(
  item: { id: string; name: string; price?: number; stockCount?: number; [key: string]: unknown }
): Promise<EnrichedInventoryItem> {
  // Parse the shoe name
  const parsed = parseShoeName(item.name)

  // Search Sneaks API for matching products (free, no API key needed)
  const { products } = await searchSneaksAPIServer(parsed.searchQuery)

  // Find the best match
  const bestMatch = findBestMatch(parsed.searchQuery, products)

  if (bestMatch) {
    // Extract image URL (prefer imageUrl, fallback to first image in images array)
    const imageUrl =
      bestMatch.imageUrl ||
      (bestMatch.images && bestMatch.images.length > 0 ? bestMatch.images[0] : undefined)

    return {
      id: item.id,
      name: bestMatch.name || parsed.model || item.name,
      originalName: item.name,
      brand: parsed.brand || bestMatch.brand || '',
      model: parsed.model || bestMatch.model || '',
      size: parsed.size,
      price: item.price,
      stockCount: item.stockCount,
      imageUrl,
      images: bestMatch.images,
      colorway: bestMatch.colorway,
      retailPrice: bestMatch.retailPrice,
      releaseDate: bestMatch.releaseDate,
      matched: true,
      searchQuery: parsed.searchQuery,
    }
  }

  // No match found - return item with parsed data but no image
  return {
    id: item.id,
    name: item.name,
    originalName: item.name,
    brand: parsed.brand,
    model: parsed.model,
    size: parsed.size,
    price: item.price,
    stockCount: item.stockCount,
    matched: false,
    searchQuery: parsed.searchQuery,
  }
}

/**
 * Creates a fallback item when enrichment fails
 */
function createFallbackItem(item: {
  id: string
  name: string
  price?: number
  stockCount?: number
  [key: string]: unknown
}): EnrichedInventoryItem {
  const parsed = parseShoeName(item.name)

  return {
    id: item.id,
    name: item.name,
    originalName: item.name,
    brand: parsed.brand,
    model: parsed.model,
    size: parsed.size,
    price: item.price,
    stockCount: item.stockCount,
    matched: false,
    searchQuery: parsed.searchQuery,
  }
}

