import { NextRequest, NextResponse } from 'next/server'
import { getCart, clearCart as clearCartService } from '@/lib/cart-service'
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

export async function GET(request: NextRequest, { params }: RouteParams) {
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

    return NextResponse.json(cart)
  } catch (error) {
    console.error('Error fetching cart:', error)
    return NextResponse.json(
      {
        error: 'Failed to fetch cart',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
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

    await clearCartService(cartId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error clearing cart:', error)
    return NextResponse.json(
      {
        error: 'Failed to clear cart',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
