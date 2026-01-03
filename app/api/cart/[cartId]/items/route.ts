import { NextRequest, NextResponse } from 'next/server'
import { getCart, addItemToCart } from '@/lib/cart-service'
import { getUserIdFromRequest } from '@/lib/auth-helper'


interface RouteParams {
  params: Promise<{
    cartId: string
  }>
}

/**
 * Get session ID from cookies
 */
function getSessionId(request: NextRequest): string | null {
  const sessionId = request.cookies.get('sessionId')?.value
  return sessionId || null
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { cartId } = await params
    const userId = await getUserIdFromRequest()
    const sessionId = getSessionId(request)

    const cart = await getCart(cartId)

    if (!cart) {
      return NextResponse.json({ error: 'Cart not found' }, { status: 404 })
    }

    // Verify authorization
    const isAuthorized =
      (userId && cart.userId === userId) ||
      (!userId && cart.sessionId === sessionId && !cart.userId)

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const body = await request.json()
    const { productId, quantity = 1 } = body

    if (!productId) {
      return NextResponse.json(
        { error: 'productId is required' },
        { status: 400 }
      )
    }

    const item = await addItemToCart(cartId, productId, quantity)

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('Error adding item to cart:', error)
    return NextResponse.json(
      {
        error: 'Failed to add item to cart',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
