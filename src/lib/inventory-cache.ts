import type { EnrichedInventoryItem } from '../types/inventory'
import type { CloverItem } from '../types/inventory'

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds
const AI_IMPROVEMENT_CACHE_DURATION = 30 * 24 * 60 * 60 * 1000 // 30 days for AI improvements (cost-effective caching)

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

interface AIImprovementCacheEntry {
  improvedName: string
  timestamp: number
}

// Shared in-memory cache for inventory endpoints
let enrichedCache: CacheEntry | null = null
let rawCache: RawCacheEntry | null = null
// Per-item enrichment cache (for lazy loading)
const enrichmentCache = new Map<string, EnrichmentCacheEntry>()
// AI improvements cache by normalized product name
const aiImprovementCache = new Map<string, AIImprovementCacheEntry>()

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
 * Also clears AI improvement caches
 */
export function clearCache(): void {
  enrichedCache = null
  rawCache = null
  enrichmentCache.clear()
  aiImprovementCache.clear()
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

/**
 * Normalize a product name for caching purposes
 */
function normalizeProductName(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/[^\w\s]/g, '')
}

/**
 * Get cached AI improvement for a normalized product name
 */
export function getCachedHFImprovement(normalizedName: string): string | null {
  const normalized = normalizeProductName(normalizedName)
  const entry = aiImprovementCache.get(normalized)
  if (!entry) return null
  
  const now = Date.now()
  if ((now - entry.timestamp) < AI_IMPROVEMENT_CACHE_DURATION) {
    return entry.improvedName
  }
  
  aiImprovementCache.delete(normalized)
  return null
}

/**
 * Set cached AI improvement for a normalized product name
 */
export function setCachedHFImprovement(normalizedName: string, improvedName: string): void {
  const normalized = normalizeProductName(normalizedName)
  aiImprovementCache.set(normalized, {
    improvedName,
    timestamp: Date.now(),
  })
}

/**
 * Clear all caches including AI improvement caches
 */
export function clearAllCaches(): void {
  enrichedCache = null
  rawCache = null
  enrichmentCache.clear()
  aiImprovementCache.clear()
}
