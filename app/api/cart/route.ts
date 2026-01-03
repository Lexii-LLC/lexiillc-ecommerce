import { NextRequest, NextResponse } from 'next/server'
import { getOrCreateCart, getCart } from '@/lib/cart-service'
import { getUserIdFromRequest } from '@/lib/auth-helper'


/**
 * Get session ID from cookies
 */
function getSessionId(request: NextRequest): string | null {
  const sessionId = request.cookies.get('sessionId')?.value
  return sessionId || null
}

/**
 * Generate a new session ID
 */
function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substring(7)}`
}

export async function GET(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest()

    // Check for cartId in query parameters (from localStorage)
    const { searchParams } = new URL(request.url)
    const cartIdParam = searchParams.get('cartId')

    // If cartId is provided, try to get that cart first
    if (cartIdParam) {
      const existingCart = await getCart(cartIdParam)
      if (existingCart) {
        // Verify cart belongs to user or session
        const sessionId = getSessionId(request)
        const isAuthorized =
          (userId && existingCart.userId === userId) ||
          (!userId &&
            existingCart.sessionId === sessionId &&
            !existingCart.userId)

        if (isAuthorized) {
          const response = NextResponse.json(existingCart)
          // Ensure sessionId cookie is set if not authenticated
          if (!userId && existingCart.sessionId) {
            response.cookies.set('sessionId', existingCart.sessionId, {
              path: '/',
              maxAge: 60 * 60 * 24 * 30, // 30 days
              sameSite: 'lax',
            })
          }
          return response
        }
      }
    }

    // Get or create cart using userId and sessionId
    let sessionId = getSessionId(request)
    if (!sessionId && !userId) {
      // Generate new sessionId for unauthenticated users
      sessionId = generateSessionId()
    }

    const cart = await getOrCreateCart(userId, sessionId)

    const response = NextResponse.json(cart)

    // Set session cookie if user is not authenticated
    if (!userId && sessionId) {
      response.cookies.set('sessionId', sessionId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        sameSite: 'lax',
      })
    }

    return response
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

export async function POST(request: NextRequest) {
  try {
    const userId = await getUserIdFromRequest()
    let sessionId = getSessionId(request)

    // Generate sessionId if not present and user is not authenticated
    if (!sessionId && !userId) {
      sessionId = generateSessionId()
    }

    const cart = await getOrCreateCart(userId, sessionId)

    const response = NextResponse.json(cart)

    if (!userId && sessionId) {
      response.cookies.set('sessionId', sessionId, {
        path: '/',
        maxAge: 60 * 60 * 24 * 30, // 30 days
        sameSite: 'lax',
      })
    }

    return response
  } catch (error) {
    console.error('Error creating cart:', error)
    return NextResponse.json(
      {
        error: 'Failed to create cart',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}
