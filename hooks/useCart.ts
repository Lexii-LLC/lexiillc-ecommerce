'use client'

import useSWR, { mutate } from 'swr'
import { useAuth } from '@/hooks/useAuth'
import {
  fetchCartFromApi,
  addToCartApi,
  updateCartItemApi,
  removeFromCartApi,
  clearCartApi,
  clearStoredCartId,
  getCartItemCount,
  getCartTotal,
  type Cart,
} from '@/lib/cart-store'
import { useEffect, useRef } from 'react'

const CART_KEY = '/api/cart'

/**
 * React hook to access and manage cart state using SWR
 */
export function useCart() {
  const { user } = useAuth()
  const previousUserId = useRef<string | null | undefined>(undefined)

  const { data: cart, error, isLoading, mutate: mutateCart } = useSWR<Cart>(
    CART_KEY,
    fetchCartFromApi,
    {
      revalidateOnFocus: false,
      revalidateOnReconnect: true,
      dedupingInterval: 10000, // Cache for 10 seconds
    }
  )

  // Handle auth state changes (login/logout)
  useEffect(() => {
    const currentUserId = user?.id ?? null

    // Skip initial render
    if (previousUserId.current === undefined) {
      previousUserId.current = currentUserId
      return
    }

    const wasSignedIn = previousUserId.current !== null
    const isSignedIn = currentUserId !== null

    // If user logged out, clear stored cart ID and refresh cart
    if (wasSignedIn && !isSignedIn) {
      clearStoredCartId()
      mutateCart()
    }

    // If user logged in, refresh cart to trigger merge
    if (!wasSignedIn && isSignedIn) {
      mutateCart()
    }

    previousUserId.current = currentUserId
  }, [user, mutateCart])

  const addToCart = async (productId: string, quantity: number = 1) => {
    if (!cart?.id) {
      // Fetch cart first if not loaded
      const newCart = await fetchCartFromApi()
      await addToCartApi(newCart.id, productId, quantity)
    } else {
      await addToCartApi(cart.id, productId, quantity)
    }
    mutateCart()
  }

  const updateQuantity = async (itemId: string, quantity: number) => {
    if (!cart?.id) return
    await updateCartItemApi(cart.id, itemId, quantity)
    mutateCart()
  }

  const removeItem = async (itemId: string) => {
    if (!cart?.id) return
    await removeFromCartApi(cart.id, itemId)
    mutateCart()
  }

  const clear = async () => {
    if (!cart?.id) return
    await clearCartApi(cart.id)
    mutateCart()
  }

  return {
    cart: cart ?? null,
    isLoading,
    error: error?.message ?? null,
    itemCount: getCartItemCount(cart ?? null),
    total: getCartTotal(cart ?? null),
    addToCart,
    updateQuantity,
    removeItem,
    clear,
    refresh: () => mutateCart(),
  }
}
