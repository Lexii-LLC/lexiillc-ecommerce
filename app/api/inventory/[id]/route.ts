import { NextRequest, NextResponse } from 'next/server'
import { getProductById, getProductVariants, getProductByCloverById } from '@/lib/supabase/products'
import type { ProductVariant } from '@/types/inventory'

interface RouteParams {
  params: Promise<{
    id: string
  }>
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params

    // Decode the ID in case it contains special characters
    const decodedId = decodeURIComponent(id)

    // 1. Try to find by UUID (standard case for Supabase products)
    let product = await getProductById(decodedId)
    let variants: ProductVariant[] = []

    // 2. If not found, try by Clover ID (fallback for legacy/raw items)
    if (!product) {
       product = await getProductByCloverById(decodedId)
    }

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // 3. If it's a parent, fetch its variants
    if (product.is_parent) {
      variants = await getProductVariants(product.id)
    }

    return NextResponse.json({
      ...product,
      variants
    })
  } catch (error) {
    console.error('Error fetching product:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch product',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
