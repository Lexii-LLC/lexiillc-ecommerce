import { NextRequest, NextResponse } from 'next/server'
import {
  getCart,
  updateCartItemQuantity,
  removeCartItem,
} from '@/lib/cart-service'
import { getUserIdFromRequest } from '@/lib/auth-helper'


interface RouteParams {
  params: Promise<{
    cartId: string
    itemId: string
  }>
}

/**
 * Get session ID from cookies
 */
function getSessionId(request: NextRequest): string | null {
  const sessionId = request.cookies.get('sessionId')?.value
  return sessionId || null
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { cartId, itemId } = await params
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
    const { quantity } = body

    if (typeof quantity !== 'number' || quantity < 1) {
      return NextResponse.json(
        { error: 'quantity must be a positive number' },
        { status: 400 }
      )
    }

    const item = await updateCartItemQuantity(cartId, itemId, quantity)

    return NextResponse.json(item)
  } catch (error) {
    console.error('Error updating cart item:', error)
    return NextResponse.json(
      {
        error: 'Failed to update cart item',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { cartId, itemId } = await params
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

    await removeCartItem(cartId, itemId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error removing cart item:', error)
    return NextResponse.json(
      {
        error: 'Failed to remove cart item',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
