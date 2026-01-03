import { NextRequest, NextResponse } from 'next/server'
import { getProducts, getUniqueBrands, getProductStats, type Product } from '@/lib/supabase/products'

interface PaginatedResponse {
  items: Product[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasMore: boolean
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1', 10)
    const pageSize = parseInt(searchParams.get('pageSize') || '50', 10)
    const getAll = searchParams.get('all') === 'true'
    const brand = searchParams.get('brand') || undefined

    // If requesting metadata only (for filters), return summary
    if (getAll) {
      const [brands, stats] = await Promise.all([
        getUniqueBrands(),
        getProductStats(),
      ])

      return NextResponse.json({
        total: stats.total,
        inStock: stats.inStock,
        normalized: stats.normalized,
        brands,
      })
    }

    // Get products from Supabase (already normalized)
    const offset = (page - 1) * pageSize
    const products = await getProducts({
      brand,
      inStock: true,
      limit: pageSize,
      offset,
    })

    // Get total count for pagination
    const stats = await getProductStats()
    const totalPages = Math.ceil(stats.inStock / pageSize)

    const response: PaginatedResponse = {
      items: products,
      total: stats.inStock,
      page,
      pageSize,
      totalPages,
      hasMore: page < totalPages,
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch inventory',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
