import { NextRequest, NextResponse } from 'next/server'
import { getProductById, getProductVariants, getProductByCloverById, getVariantById } from '@/lib/supabase/products'
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

    // 1. Try to find by UUID in products table
    let product = await getProductById(decodedId)
    let variants: ProductVariant[] = []

    // 2. If not found, try by Clover ID (fallback for legacy/raw items)
    if (!product) {
       product = await getProductByCloverById(decodedId)
    }

    // 3. If still not found, check if it's a variant ID
    if (!product) {
      const variantResult = await getVariantById(decodedId)
      if (variantResult) {
        // Return the variant info merged with parent product info for cart display
        const { variant, parent } = variantResult
        return NextResponse.json({
          // Use parent product info for display
          id: variant.id, // But use variant ID
          clover_id: variant.clover_item_id,
          raw_name: parent.raw_name,
          clean_name: `${parent.clean_name} - ${variant.color || ''} ${variant.size || ''}`.trim(),
          clean_brand: parent.clean_brand,
          clean_model: parent.clean_model,
          clean_colorway: variant.color,
          clean_size: variant.size,
          product_type: parent.product_type,
          price: variant.price ?? parent.price,
          stock_quantity: variant.stock_quantity,
          is_normalized: parent.is_normalized,
          is_parent: false,
          image_url: parent.image_url,
          // Include size/color for cart display
          size: variant.size,
          color: variant.color,
          variants: [] // Variants don't have sub-variants
        })
      }
    }

    if (!product) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 })
    }

    // 4. If it's a parent, fetch its variants
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
