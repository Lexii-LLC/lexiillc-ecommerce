import type { EnrichedInventoryItem } from '../types/inventory'

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

interface CacheEntry {
  data: EnrichedInventoryItem[]
  timestamp: number
}

// Shared in-memory cache for inventory endpoints
let cache: CacheEntry | null = null

/**
 * Get cached inventory if it's still valid
 */
export function getCachedInventory(): EnrichedInventoryItem[] | null {
  if (!cache) return null
  
  const now = Date.now()
  if ((now - cache.timestamp) < CACHE_DURATION) {
    return cache.data
  }
  
  return null
}

/**
 * Set cached inventory
 */
export function setCachedInventory(data: EnrichedInventoryItem[]): void {
  cache = {
    data,
    timestamp: Date.now(),
  }
}

/**
 * Clear the cache (useful for testing or forced refresh)
 */
export function clearCache(): void {
  cache = null
}

/**
 * Check if cache exists and is valid
 */
export function isCacheValid(): boolean {
  if (!cache) return false
  const now = Date.now()
  return (now - cache.timestamp) < CACHE_DURATION
}

