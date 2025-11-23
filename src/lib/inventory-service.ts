import { fetchCloverInventoryServer } from './clover-api'
import { searchSneaksAPIServer, findBestMatch } from './sneaks-api'
import { parseShoeName } from './shoe-parser'
import { getCachedRawInventory, setCachedRawInventory, getCachedEnrichment, setCachedEnrichment } from './inventory-cache'
import type { EnrichedInventoryItem } from '../types/inventory'
import type { CloverItem } from '../types/inventory'

/**
 * Get raw Clover inventory (fast, no enrichment)
 */
export async function getRawInventory(): Promise<CloverItem[]> {
  // Check cache first
  const cached = getCachedRawInventory()
  if (cached) {
    return cached
  }

  // Fetch from Clover
  const cloverItems = await fetchCloverInventoryServer()

  // Filter out items with $0 price or no price
  const validItems = cloverItems.filter((item) => {
    return item.price !== undefined && item.price !== null && item.price > 0
  })

  // Cache raw items
  setCachedRawInventory(validItems)

  return validItems
}

/**
 * Enrich a batch of items (for pagination)
 */
export async function enrichItemsBatch(items: CloverItem[]): Promise<EnrichedInventoryItem[]> {
  const batchSize = 10
  const enrichedItems: EnrichedInventoryItem[] = []
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize)
    const batchPromises = batch.map(async (item) => {
      // Check if already enriched and cached
      const cached = getCachedEnrichment(item.id)
      if (cached) {
        return cached
      }

      try {
        const enriched = await enrichInventoryItem(item)
        // Cache the enriched item
        setCachedEnrichment(item.id, enriched)
        return enriched
      } catch (error) {
        // Gracefully handle any errors - return item without enrichment
        const fallback = createFallbackItem(item)
        setCachedEnrichment(item.id, fallback)
        return fallback
      }
    })

    const batchResults = await Promise.all(batchPromises)
    enrichedItems.push(...batchResults)

    // Small delay between batches to avoid overwhelming the API
    if (i + batchSize < items.length) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  return enrichedItems
}

/**
 * Main service that orchestrates Clover fetch, parsing, and Sneaks API lookup
 * NOTE: This enriches ALL items - use getRawInventory + enrichItemsBatch for pagination
 */
export async function getEnrichedInventory(): Promise<EnrichedInventoryItem[]> {
  try {
    const rawItems = await getRawInventory()
    return await enrichItemsBatch(rawItems)
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

