import { fetchCloverInventoryServer } from './clover-api'
import { parseShoeName } from './shoe-parser'
import {
  getCachedRawInventory,
  setCachedRawInventory,
  getCachedEnrichment,
  setCachedEnrichment,
} from './inventory-cache'
import { cleanProductNameSafe } from './ai-product-cleaner'
import type { EnrichedInventoryItem, CloverItem } from '@/types/inventory'

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

  // Filter out items with $0 price, no price, or out of stock
  const validItems = cloverItems.filter((item) => {
    const hasValidPrice =
      item.price !== undefined && item.price !== null && item.price > 0
    const isInStock =
      item.stockCount === undefined ||
      item.stockCount === null ||
      item.stockCount > 0
    return hasValidPrice && isInStock
  })

  // Cache raw items
  setCachedRawInventory(validItems)

  return validItems
}

/**
 * Enrich a batch of items (for pagination)
 */
export async function enrichItemsBatch(
  items: CloverItem[]
): Promise<EnrichedInventoryItem[]> {
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
 * Main service that orchestrates Clover fetch, parsing, and enrichment
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
 * Enriches a single inventory item with AI-powered name and size cleaning
 */
async function enrichInventoryItem(
  item: {
    id: string
    name: string
    price?: number
    stockCount?: number
    [key: string]: unknown
  }
): Promise<EnrichedInventoryItem> {
  // First, try AI-powered cleaning (cost-effective with caching)
  const cleanedData = await cleanProductNameSafe(item.name)

  // Fallback to regex parsing if AI fails or isn't available
  const parsed = parseShoeName(item.name)

  // Use AI results if available and confident, otherwise use parsed results
  const brand = cleanedData.brand || parsed.brand || ''
  const model = cleanedData.model || parsed.model || item.name
  const size = cleanedData.size || (parsed.size ? convertSizeToStandard(parsed.size) : undefined)
  const cleanedName = cleanedData.cleanedName || item.name

  // Build search query from cleaned data
  const searchQuery = brand && model ? `${brand} ${model}` : cleanedName

  return {
    id: item.id,
    name: cleanedName,
    originalName: item.name,
    brand,
    model,
    size,
    variant: undefined,
    price: item.price,
    stockCount: item.stockCount,
    matched: cleanedData.brand !== '',
    searchQuery,
  }
}

/**
 * Convert parsed size string to standard size format
 */
function convertSizeToStandard(
  sizeStr: string
): 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL' | undefined {
  const upper = sizeStr.toUpperCase().trim()

  // If already in standard format
  if (['S', 'M', 'L', 'XL', 'XXL', 'XXXL'].includes(upper)) {
    return upper as 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL'
  }

  // Try to extract numeric size
  const numericMatch = upper.match(/(\d+\.?\d*)/)
  if (numericMatch) {
    const numericSize = parseFloat(numericMatch[1])
    if (numericSize <= 6) return 'S'
    else if (numericSize <= 8) return 'M'
    else if (numericSize <= 10) return 'L'
    else if (numericSize <= 12) return 'XL'
    else if (numericSize <= 14) return 'XXL'
    else return 'XXXL'
  }

  return undefined
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
    brand: parsed.brand || '',
    model: parsed.model || item.name,
    size: parsed.size as 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'XXXL' | undefined,
    price: item.price,
    stockCount: item.stockCount,
    matched: false,
    searchQuery: parsed.searchQuery || item.name,
  }
}
