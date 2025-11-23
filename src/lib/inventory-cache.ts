import type { EnrichedInventoryItem } from '../types/inventory'
import type { CloverItem } from '../types/inventory'

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

interface CacheEntry {
  data: EnrichedInventoryItem[]
  timestamp: number
}

interface RawCacheEntry {
  data: CloverItem[]
  timestamp: number
}

interface EnrichmentCacheEntry {
  data: EnrichedInventoryItem
  timestamp: number
}

// Shared in-memory cache for inventory endpoints
let enrichedCache: CacheEntry | null = null
let rawCache: RawCacheEntry | null = null
// Per-item enrichment cache (for lazy loading)
const enrichmentCache = new Map<string, EnrichmentCacheEntry>()

/**
 * Get cached raw Clover items if they're still valid
 */
export function getCachedRawInventory(): CloverItem[] | null {
  if (!rawCache) return null
  
  const now = Date.now()
  if ((now - rawCache.timestamp) < CACHE_DURATION) {
    return rawCache.data
  }
  
  return null
}

/**
 * Set cached raw Clover items
 */
export function setCachedRawInventory(data: CloverItem[]): void {
  rawCache = {
    data,
    timestamp: Date.now(),
  }
}

/**
 * Get cached enriched inventory if it's still valid
 */
export function getCachedInventory(): EnrichedInventoryItem[] | null {
  if (!enrichedCache) return null
  
  const now = Date.now()
  if ((now - enrichedCache.timestamp) < CACHE_DURATION) {
    return enrichedCache.data
  }
  
  return null
}

/**
 * Set cached enriched inventory
 */
export function setCachedInventory(data: EnrichedInventoryItem[]): void {
  enrichedCache = {
    data,
    timestamp: Date.now(),
  }
}

/**
 * Get cached enrichment for a specific item
 */
export function getCachedEnrichment(itemId: string): EnrichedInventoryItem | null {
  const entry = enrichmentCache.get(itemId)
  if (!entry) return null
  
  const now = Date.now()
  if ((now - entry.timestamp) < CACHE_DURATION) {
    return entry.data
  }
  
  enrichmentCache.delete(itemId)
  return null
}

/**
 * Set cached enrichment for a specific item
 */
export function setCachedEnrichment(itemId: string, data: EnrichedInventoryItem): void {
  enrichmentCache.set(itemId, {
    data,
    timestamp: Date.now(),
  })
}

/**
 * Clear all caches (useful for testing or forced refresh)
 */
export function clearCache(): void {
  enrichedCache = null
  rawCache = null
  enrichmentCache.clear()
}

/**
 * Check if enriched cache exists and is valid
 */
export function isEnrichedCacheValid(): boolean {
  if (!enrichedCache) return false
  const now = Date.now()
  return (now - enrichedCache.timestamp) < CACHE_DURATION
}

/**
 * Check if raw cache exists and is valid
 */
export function isRawCacheValid(): boolean {
  if (!rawCache) return false
  const now = Date.now()
  return (now - rawCache.timestamp) < CACHE_DURATION
}
