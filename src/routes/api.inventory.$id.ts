import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRawInventory, enrichItemsBatch } from '../lib/inventory-service'
import { getCachedEnrichment } from '../lib/inventory-cache'

export const Route = createFileRoute('/api/inventory/$id')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        try {
          const { id } = params
          
          // Decode the ID in case it's URL-encoded
          const decodedId = decodeURIComponent(id)

          // Check if this specific item is already enriched and cached
          let product = getCachedEnrichment(decodedId) || getCachedEnrichment(id)
          
          if (!product) {
            // Get raw inventory and find the item
            const rawItems = await getRawInventory()
            const rawItem = rawItems.find((item) => item.id === decodedId || item.id === id)
            
            if (!rawItem) {
              return json(
                { error: 'Product not found', id: decodedId },
                { status: 404 }
              )
            }

            // Enrich just this one item
            const enriched = await enrichItemsBatch([rawItem])
            product = enriched[0]
          }

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
