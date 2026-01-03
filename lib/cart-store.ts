import type { EnrichedInventoryItem } from '@/types/inventory'

export interface CartItem {
  id: string
  productId: string
  quantity: number
  product?: EnrichedInventoryItem
}

export interface Cart {
  id: string
  userId: string | null
  sessionId: string | null
  items: CartItem[]
  createdAt: string
  updatedAt: string
}

// localStorage key for cart ID
const CART_ID_STORAGE_KEY = 'lexii_cart_id'

/**
 * Get cart ID from localStorage
 */
export function getStoredCartId(): string | null {
  if (typeof window === 'undefined') {
    return null
  }
  try {
    return localStorage.getItem(CART_ID_STORAGE_KEY)
  } catch {
    return null
  }
}

/**
 * Store cart ID in localStorage
 */
export function storeCartId(cartId: string): void {
  if (typeof window === 'undefined') {
    return
  }
  try {
    localStorage.setItem(CART_ID_STORAGE_KEY, cartId)
  } catch {
    // Ignore localStorage errors (e.g., quota exceeded)
  }
}

/**
 * Clear cart ID from localStorage
 */
export function clearStoredCartId(): void {
  if (typeof window === 'undefined') {
    return
  }
  try {
    localStorage.removeItem(CART_ID_STORAGE_KEY)
  } catch {
    // Ignore localStorage errors
  }
}

/**
 * Fetch cart from API
 */
export async function fetchCartFromApi(): Promise<Cart> {
  const storedCartId = getStoredCartId()
  const url = storedCartId
    ? `/api/cart?cartId=${encodeURIComponent(storedCartId)}`
    : '/api/cart'

  const response = await fetch(url, {
    method: 'GET',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to fetch cart')
  }

  const cart: Cart = await response.json()

  // Store cart ID in localStorage for future requests
  if (cart.id) {
    storeCartId(cart.id)
  }

  return cart
}

/**
 * Add item to cart via API
 */
export async function addToCartApi(
  cartId: string,
  productId: string,
  quantity: number = 1
): Promise<void> {
  const response = await fetch(`/api/cart/${cartId}/items`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ productId, quantity }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    let errorMessage = 'Failed to add item to cart'
    try {
      const errorData = JSON.parse(errorText)
      errorMessage = errorData.error || errorData.message || errorMessage
    } catch {
      if (errorText) errorMessage = errorText
    }
    throw new Error(errorMessage)
  }
}

/**
 * Update cart item quantity via API
 */
export async function updateCartItemApi(
  cartId: string,
  itemId: string,
  quantity: number
): Promise<void> {
  const response = await fetch(`/api/cart/${cartId}/items/${itemId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({ quantity }),
  })

  if (!response.ok) {
    throw new Error('Failed to update cart item')
  }
}

/**
 * Remove item from cart via API
 */
export async function removeFromCartApi(
  cartId: string,
  itemId: string
): Promise<void> {
  const response = await fetch(`/api/cart/${cartId}/items/${itemId}`, {
    method: 'DELETE',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to remove item from cart')
  }
}

/**
 * Clear cart via API
 */
export async function clearCartApi(cartId: string): Promise<void> {
  const response = await fetch(`/api/cart/${cartId}`, {
    method: 'DELETE',
    credentials: 'include',
  })

  if (!response.ok) {
    throw new Error('Failed to clear cart')
  }

  clearStoredCartId()
}

/**
 * Get total item count in cart
 */
export function getCartItemCount(cart: Cart | null): number {
  if (!cart) {
    return 0
  }
  return cart.items.reduce((total, item) => total + item.quantity, 0)
}

/**
 * Get cart total price (requires products to be loaded)
 */
export function getCartTotal(cart: Cart | null): number {
  if (!cart) {
    return 0
  }
  return cart.items.reduce((total, item) => {
    if (item.product?.price) {
      return total + item.product.price * item.quantity
    }
    return total
  }, 0)
}
