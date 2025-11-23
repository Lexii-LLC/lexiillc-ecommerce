import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getEnrichedInventory } from '../lib/inventory-service'
import { getCachedInventory, setCachedInventory } from '../lib/inventory-cache'
import type { EnrichedInventoryItem } from '../types/inventory'

interface PaginatedResponse {
  items: EnrichedInventoryItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasMore: boolean
}

export const Route = createFileRoute('/api/inventory')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        try {
          const url = new URL(request.url)
          const page = parseInt(url.searchParams.get('page') || '1', 10)
          const pageSize = parseInt(url.searchParams.get('pageSize') || '50', 10)
          const getAll = url.searchParams.get('all') === 'true' // For filters/metadata

          // Check if cache exists and is still valid
          let inventory = getCachedInventory()
          if (!inventory) {
            // Fetch fresh data (this will fetch all items from Clover)
            inventory = await getEnrichedInventory()
            // Update cache
            setCachedInventory(inventory)
          }

          // If requesting all items (for filters/metadata), return summary
          if (getAll) {
            return json({
              total: inventory.length,
              brands: Array.from(new Set(inventory.map((i) => i.brand).filter(Boolean))).sort(),
              sizes: Array.from(new Set(inventory.map((i) => i.size).filter(Boolean))).sort(),
            })
          }

          // Paginate results
          const startIndex = (page - 1) * pageSize
          const endIndex = startIndex + pageSize
          const paginatedItems = inventory.slice(startIndex, endIndex)
          const totalPages = Math.ceil(inventory.length / pageSize)

          const response: PaginatedResponse = {
            items: paginatedItems,
            total: inventory.length,
            page,
            pageSize,
            totalPages,
            hasMore: page < totalPages,
          }

          return json(response)
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

