import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getEnrichedInventory } from '../../lib/inventory-service'
import { getCachedInventory, setCachedInventory } from '../../lib/inventory-cache'

export const Route = createFileRoute('/api/inventory/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const { id } = params
          
          // Decode the ID in case it's URL-encoded
          const decodedId = decodeURIComponent(id)

          // Check if cache exists and is still valid
          let inventory = getCachedInventory()
          if (!inventory) {
            // Fetch fresh data
            inventory = await getEnrichedInventory()
            
            // Update cache
            setCachedInventory(inventory)
          }

          // Find the product by ID (try both encoded and decoded versions)
          const product = inventory.find(
            (item) => item.id === decodedId || item.id === id
          )

          if (!product) {
            return json(
              { error: 'Product not found', id: decodedId },
              { status: 404 }
            )
          }

          return json(product)
        } catch (error) {
          console.error('Error fetching product:', error)
          return json(
            { error: 'Failed to fetch product', message: error instanceof Error ? error.message : 'Unknown error' },
            { status: 500 }
          )
        }
      },
    },
  },
})
