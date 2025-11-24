import { useStore } from '@tanstack/react-store'
import { cartStore, fetchCart, addToCart as addToCartStore, updateCartItemQuantity, removeFromCart, clearCart, getCartItemCount, getCartTotal, clearStoredCartId } from '../lib/cart-store'
import { useEffect, useRef } from 'react'
import { useUser } from '@clerk/clerk-react'

/**
 * React hook to access and manage cart state
 */
export function useCart() {
  const state = useStore(cartStore)
  const { isSignedIn, isLoaded: authLoaded } = useUser()
  const previousAuthState = useRef<boolean | null>(null)

  // Fetch cart on mount if not already loaded
  useEffect(() => {
    if (!state.cart && !state.isLoading) {
      fetchCart().catch(console.error)
    }
  }, [state.cart, state.isLoading])

  // Handle auth state changes (login/logout)
  useEffect(() => {
    if (!authLoaded) return

    const wasSignedIn = previousAuthState.current
    const isNowSignedIn = isSignedIn

    // If user logged out, clear stored cart ID and refresh cart
    if (wasSignedIn === true && isNowSignedIn === false) {
      clearStoredCartId()
      // Reset cart state and fetch new session cart
      cartStore.setState({ cart: null, isLoading: false, error: null })
      fetchCart().catch(console.error)
    }

    // If user logged in, refresh cart to trigger merge
    if (wasSignedIn === false && isNowSignedIn === true) {
      fetchCart().catch(console.error)
    }

    previousAuthState.current = isNowSignedIn
  }, [isSignedIn, authLoaded])

  return {
    cart: state.cart,
    isLoading: state.isLoading,
    error: state.error,
    itemCount: getCartItemCount(),
    total: getCartTotal(),
    addToCart: async (productId: string, quantity: number = 1) => {
      await addToCartStore(productId, quantity)
    },
    updateQuantity: async (itemId: string, quantity: number) => {
      await updateCartItemQuantity(itemId, quantity)
    },
    removeItem: async (itemId: string) => {
      await removeFromCart(itemId)
    },
    clear: async () => {
      await clearCart()
    },
    refresh: async () => {
      await fetchCart()
    },
  }
}

