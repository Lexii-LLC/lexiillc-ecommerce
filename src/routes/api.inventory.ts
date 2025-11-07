import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getEnrichedInventory } from '../lib/inventory-service'
import type { EnrichedInventoryItem } from '../types/inventory'

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000 // 5 minutes in milliseconds

interface CacheEntry {
  data: EnrichedInventoryItem[]
  timestamp: number
}

// In-memory cache
let cache: CacheEntry | null = null

export const Route = createFileRoute('/api/inventory')({
  server: {
    handlers: {
      GET: async () => {
        try {
          // Check if cache exists and is still valid
          const now = Date.now()
          if (cache && (now - cache.timestamp) < CACHE_DURATION) {
            return json(cache.data)
          }

          // Fetch fresh data
          const inventory = await getEnrichedInventory()
          
          // Update cache
          cache = {
            data: inventory,
            timestamp: now,
          }

          return json(inventory)
        } catch (error) {
          console.error('Error fetching inventory:', error)
          return json(
            { error: 'Failed to fetch inventory', message: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
          )
        }
      },
    },
  },
})

