import { NextRequest, NextResponse } from 'next/server'
import { getProductByCloverById } from '@/lib/supabase/products'

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

    // Get product from Supabase by Clover ID
    const product = await getProductByCloverById(decodedId)

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    return NextResponse.json(product)
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
