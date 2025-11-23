import { createFileRoute } from '@tanstack/react-router'
import { json } from '@tanstack/react-start'
import { getRawInventory, enrichItemsBatch } from '../lib/inventory-service'
import { parseShoeName } from '../lib/shoe-parser'
import type { EnrichedInventoryItem } from '../types/inventory'
import type { CloverItem } from '../types/inventory'

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

          // Get raw inventory (fast, cached, no enrichment)
          const rawItems = await getRawInventory()

          // If requesting metadata only (for filters), return summary from raw items
          if (getAll) {
            // Parse brands and sizes from raw items (fast, no API calls)
            const brands = new Set<string>()
            const sizes = new Set<string>()
            
            rawItems.forEach((item) => {
              const parsed = parseShoeName(item.name)
              if (parsed.brand) brands.add(parsed.brand)
              if (parsed.size) sizes.add(parsed.size)
            })

            return json({
              total: rawItems.length,
              brands: Array.from(brands).sort(),
              sizes: Array.from(sizes).sort(),
            })
          }

          // Paginate raw items first (fast)
          const startIndex = (page - 1) * pageSize
          const endIndex = startIndex + pageSize
          const paginatedRawItems = rawItems.slice(startIndex, endIndex)
          const totalPages = Math.ceil(rawItems.length / pageSize)

          // Enrich ONLY the items for this page (lazy loading!)
          const enrichedItems = await enrichItemsBatch(paginatedRawItems)

          // Optionally pre-enrich next page in background (non-blocking)
          if (page < totalPages) {
            const nextPageStart = endIndex
            const nextPageEnd = Math.min(nextPageStart + pageSize, rawItems.length)
            const nextPageItems = rawItems.slice(nextPageStart, nextPageEnd)
            // Don't await - let it run in background
            enrichItemsBatch(nextPageItems).catch((err) => {
              console.warn('Background enrichment failed:', err)
            })
          }

          const response: PaginatedResponse = {
            items: enrichedItems,
            total: rawItems.length,
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

