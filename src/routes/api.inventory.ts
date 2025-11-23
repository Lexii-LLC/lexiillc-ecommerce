import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getEnrichedInventory } from '../lib/inventory-service'
import { getCachedInventory, setCachedInventory } from '../lib/inventory-cache'

export const Route = createFileRoute('/api/inventory')({
  server: {
    handlers: {
      GET: async () => {
        try {
          // Check if cache exists and is still valid
          const cached = getCachedInventory()
          if (cached) {
            return json(cached)
          }

          // Fetch fresh data
          const inventory = await getEnrichedInventory()
          
          // Update cache
          setCachedInventory(inventory)

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

