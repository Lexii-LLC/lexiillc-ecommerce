import { Store } from '@tanstack/store'
import type { EnrichedInventoryItem } from '../types/inventory'

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

interface CartStore {
  cart: Cart | null
  isLoading: boolean
  error: string | null
}

const initialCartState: CartStore = {
  cart: null,
  isLoading: false,
  error: null,
}

export const cartStore = new Store<CartStore>(initialCartState)

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
 * Get or create cart
 */
export async function fetchCart(): Promise<Cart> {
  cartStore.setState((state) => ({ ...state, isLoading: true, error: null }))

  try {
    // Include stored cart ID in request if available
    const storedCartId = getStoredCartId()
    const url = storedCartId ? `/api/cart?cartId=${encodeURIComponent(storedCartId)}` : '/api/cart'
    
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
    
    cartStore.setState({ cart, isLoading: false, error: null })
    return cart
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    cartStore.setState((state) => ({ ...state, isLoading: false, error: errorMessage }))
    throw error
  }
}

/**
 * Add item to cart
 */
export async function addToCart(productId: string, quantity: number = 1): Promise<void> {
  const state = cartStore.state

  // Ensure we have a cart
  let cart = state.cart
  if (!cart) {
    cart = await fetchCart()
  }

  if (!cart || !cart.id) {
    throw new Error('Cart not available')
  }

  if (!productId) {
    throw new Error('Product ID is required')
  }

  cartStore.setState((state) => ({ ...state, isLoading: true, error: null }))

  try {
    const response = await fetch(`/api/cart/${cart.id}/items`, {
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

    // Refresh cart to get updated state
    await fetchCart()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    cartStore.setState((state) => ({ ...state, isLoading: false, error: errorMessage }))
    throw error
  }
}

/**
 * Update cart item quantity
 */
export async function updateCartItemQuantity(itemId: string, quantity: number): Promise<void> {
  const state = cartStore.state
  const cart = state.cart

  if (!cart) {
    throw new Error('Cart not found')
  }

  cartStore.setState((state) => ({ ...state, isLoading: true, error: null }))

  try {
    const response = await fetch(`/api/cart/${cart.id}/items/${itemId}`, {
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

    // Refresh cart
    await fetchCart()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    cartStore.setState((state) => ({ ...state, isLoading: false, error: errorMessage }))
    throw error
  }
}

/**
 * Remove item from cart
 */
export async function removeFromCart(itemId: string): Promise<void> {
  const state = cartStore.state
  const cart = state.cart

  if (!cart) {
    throw new Error('Cart not found')
  }

  cartStore.setState((state) => ({ ...state, isLoading: true, error: null }))

  try {
    const response = await fetch(`/api/cart/${cart.id}/items/${itemId}`, {
      method: 'DELETE',
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Failed to remove item from cart')
    }

    // Refresh cart
    await fetchCart()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    cartStore.setState((state) => ({ ...state, isLoading: false, error: errorMessage }))
    throw error
  }
}

/**
 * Clear entire cart
 */
export async function clearCart(): Promise<void> {
  const state = cartStore.state
  const cart = state.cart

  if (!cart) {
    return
  }

  cartStore.setState((state) => ({ ...state, isLoading: true, error: null }))

  try {
    const response = await fetch(`/api/cart/${cart.id}`, {
      method: 'DELETE',
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error('Failed to clear cart')
    }

    // Clear stored cart ID
    clearStoredCartId()

    // Refresh cart (will create new empty cart)
    await fetchCart()
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    cartStore.setState((state) => ({ ...state, isLoading: false, error: errorMessage }))
    throw error
  }
}

/**
 * Get total item count in cart
 */
export function getCartItemCount(): number {
  const state = cartStore.state
  if (!state.cart) {
    return 0
  }
  return state.cart.items.reduce((total, item) => total + item.quantity, 0)
}

/**
 * Get cart total price (requires products to be loaded)
 */
export function getCartTotal(): number {
  const state = cartStore.state
  if (!state.cart) {
    return 0
  }
  return state.cart.items.reduce((total, item) => {
    if (item.product?.price) {
      return total + item.product.price * item.quantity
    }
    return total
  }, 0)
}

