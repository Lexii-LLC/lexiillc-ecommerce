import { supabase, type CartRow, type CartItemRow } from './supabase'
import type { EnrichedInventoryItem } from '@/types/inventory'
import {
  MAX_CART_ITEMS,
  MAX_ITEM_QUANTITY,
  MAX_CARTS_PER_USER,
  MAX_SESSION_CARTS,
} from './cart-limits'

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
  createdAt: Date
  updatedAt: Date
}

/**
 * Convert database cart row to Cart interface
 */
function rowToCart(row: CartRow): Cart {
  return {
    id: row.id,
    userId: row.userId,
    sessionId: row.sessionId,
    items: (row.CartItem || []).map((item) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
    })),
    createdAt: new Date(row.createdAt),
    updatedAt: new Date(row.updatedAt),
  }
}

/**
 * Helper to get cart table
 */
function getCartTable() {
  return supabase.from('Cart')
}

/**
 * Helper to get cart item table
 */
function getCartItemTable() {
  return supabase.from('CartItem')
}

/**
 * Get or create a cart for a user or session
 */
export async function getOrCreateCart(
  userId?: string | null,
  sessionId?: string | null
): Promise<Cart> {
  if (userId) {
    const { data: existingUserCarts, error: userCartError } = await getCartTable()
      .select('*, CartItem(*)')
      .eq('userId', userId)
      .order('updatedAt', { ascending: false })
      .limit(1)

    let userCart: Cart | null = null
    if (!userCartError && existingUserCarts && existingUserCarts.length > 0) {
      userCart = rowToCart(existingUserCarts[0] as unknown as CartRow)
    }

    if (sessionId) {
      const { data: existingSessionCarts, error: sessionCartError } =
        await getCartTable()
          .select('*, CartItem(*)')
          .eq('sessionId', sessionId)
          .is('userId', null)
          .order('updatedAt', { ascending: false })
          .limit(1)

      if (
        !sessionCartError &&
        existingSessionCarts &&
        existingSessionCarts.length > 0
      ) {
        const sessionCart = existingSessionCarts[0] as unknown as CartRow
        const sessionCartId = sessionCart.id

        if (userCart) {
          return await mergeCarts(sessionCartId, userCart.id)
        } else {
          const now = new Date().toISOString()
          const { data: updatedCart, error: updateError } = await getCartTable()
            .update({
              userId: userId,
              sessionId: null,
              updatedAt: now,
            } as Record<string, unknown>)
            .eq('id', sessionCartId)
            .select('*, CartItem(*)')
            .single()

          if (updateError || !updatedCart) {
            throw new Error(
              `Failed to convert session cart: ${updateError?.message || 'Unknown error'}`
            )
          }

          return rowToCart(updatedCart as unknown as CartRow)
        }
      }
    }

    if (userCart) {
      return userCart
    }

    const { data: allUserCarts } = await getCartTable()
      .select('id, updatedAt')
      .eq('userId', userId)
      .order('updatedAt', { ascending: false })

    if (allUserCarts && allUserCarts.length >= MAX_CARTS_PER_USER) {
      const cartsToDelete = allUserCarts.slice(MAX_CARTS_PER_USER - 1)
      const cartIdsToDelete = cartsToDelete.map((c: { id: string }) => c.id)

      if (cartIdsToDelete.length > 0) {
        await getCartItemTable().delete().in('cartId', cartIdsToDelete)
        await getCartTable().delete().in('id', cartIdsToDelete)
      }
    }

    const cartId = crypto.randomUUID()
    const now = new Date().toISOString()
    const { data: newCart, error } = await getCartTable()
      .insert({
        id: cartId,
        userId: userId,
        sessionId: null,
        createdAt: now,
        updatedAt: now,
      } as Record<string, unknown>)
      .select('*, CartItem(*)')
      .single()

    if (error || !newCart) {
      throw new Error(`Failed to create cart: ${error?.message || 'Unknown error'}`)
    }

    return rowToCart(newCart as unknown as CartRow)
  }

  if (sessionId) {
    const { data: existingCarts, error } = await getCartTable()
      .select('*, CartItem(*)')
      .eq('sessionId', sessionId)
      .is('userId', null)
      .order('updatedAt', { ascending: false })
      .limit(1)

    if (!error && existingCarts && existingCarts.length > 0) {
      return rowToCart(existingCarts[0] as unknown as CartRow)
    }

    const { data: allSessionCarts } = await getCartTable()
      .select('id, updatedAt')
      .eq('sessionId', sessionId)
      .is('userId', null)
      .order('updatedAt', { ascending: false })

    if (allSessionCarts && allSessionCarts.length >= MAX_SESSION_CARTS) {
      const cartsToDelete = allSessionCarts.slice(MAX_SESSION_CARTS - 1)
      const cartIdsToDelete = cartsToDelete.map((c: { id: string }) => c.id)

      if (cartIdsToDelete.length > 0) {
        await getCartItemTable().delete().in('cartId', cartIdsToDelete)
        await getCartTable().delete().in('id', cartIdsToDelete)
      }
    }
  }

  const cartId = crypto.randomUUID()
  const now = new Date().toISOString()
  const { data: newCart, error } = await getCartTable()
    .insert({
      id: cartId,
      userId: null,
      sessionId: sessionId || null,
      createdAt: now,
      updatedAt: now,
    } as Record<string, unknown>)
    .select('*, CartItem(*)')
    .single()

  if (error || !newCart) {
    throw new Error(`Failed to create cart: ${error?.message || 'Unknown error'}`)
  }

  return rowToCart(newCart as unknown as CartRow)
}

/**
 * Add item to cart or update quantity if already exists
 */
export async function addItemToCart(
  cartId: string,
  productId: string,
  quantity: number = 1
): Promise<CartItem> {
  if (quantity <= 0 || !Number.isInteger(quantity)) {
    throw new Error('Quantity must be a positive integer')
  }

  if (quantity > MAX_ITEM_QUANTITY) {
    throw new Error(`Quantity cannot exceed ${MAX_ITEM_QUANTITY} per item`)
  }

  const cart = await getCart(cartId)
  if (!cart) {
    throw new Error('Cart not found')
  }

  const { data: existingItems } = await getCartItemTable()
    .select('*')
    .eq('cartId', cartId)
    .eq('productId', productId)
    .limit(1)

  const existingItem =
    existingItems && existingItems.length > 0
      ? (existingItems[0] as unknown as CartItemRow)
      : null

  if (existingItem) {
    const newQuantity = existingItem.quantity + quantity
    if (newQuantity > MAX_ITEM_QUANTITY) {
      throw new Error(`Total quantity cannot exceed ${MAX_ITEM_QUANTITY} per item`)
    }

    const { data: updated, error } = await getCartItemTable()
      .update({ quantity: newQuantity } as Record<string, unknown>)
      .eq('id', existingItem.id)
      .select()
      .single()

    await getCartTable()
      .update({ updatedAt: new Date().toISOString() } as Record<string, unknown>)
      .eq('id', cartId)

    if (error || !updated) {
      throw new Error(`Failed to update cart item: ${error?.message || 'Unknown error'}`)
    }

    const updatedItem = updated as unknown as CartItemRow
    return {
      id: updatedItem.id,
      productId: updatedItem.productId,
      quantity: updatedItem.quantity,
    }
  }

  if (cart.items.length >= MAX_CART_ITEMS) {
    throw new Error(`Cart cannot have more than ${MAX_CART_ITEMS} items`)
  }

  const itemId = crypto.randomUUID()
  const { data: newItem, error } = await getCartItemTable()
    .insert({
      id: itemId,
      cartId,
      productId,
      quantity,
    } as Record<string, unknown>)
    .select()
    .single()

  if (error || !newItem) {
    throw new Error(`Failed to add item to cart: ${error?.message || 'Unknown error'}`)
  }

  await getCartTable()
    .update({ updatedAt: new Date().toISOString() } as Record<string, unknown>)
    .eq('id', cartId)

  const newItemRow = newItem as unknown as CartItemRow
  return {
    id: newItemRow.id,
    productId: newItemRow.productId,
    quantity: newItemRow.quantity,
  }
}

/**
 * Update cart item quantity
 */
export async function updateCartItemQuantity(
  cartId: string,
  itemId: string,
  quantity: number
): Promise<CartItem> {
  if (quantity <= 0 || !Number.isInteger(quantity)) {
    throw new Error('Quantity must be a positive integer')
  }

  if (quantity > MAX_ITEM_QUANTITY) {
    throw new Error(`Quantity cannot exceed ${MAX_ITEM_QUANTITY} per item`)
  }

  const { data: item } = await getCartItemTable()
    .select('*')
    .eq('id', itemId)
    .eq('cartId', cartId)
    .single()

  if (!item) {
    throw new Error('Cart item not found or does not belong to this cart')
  }

  const { data: updated, error } = await getCartItemTable()
    .update({ quantity } as Record<string, unknown>)
    .eq('id', itemId)
    .eq('cartId', cartId)
    .select()
    .single()

  await getCartTable()
    .update({ updatedAt: new Date().toISOString() } as Record<string, unknown>)
    .eq('id', cartId)

  if (error || !updated) {
    throw new Error(`Failed to update cart item: ${error?.message || 'Unknown error'}`)
  }

  const updatedItem = updated as unknown as CartItemRow
  return {
    id: updatedItem.id,
    productId: updatedItem.productId,
    quantity: updatedItem.quantity,
  }
}

/**
 * Remove item from cart
 */
export async function removeCartItem(
  cartId: string,
  itemId: string
): Promise<void> {
  const { error } = await getCartItemTable()
    .delete()
    .eq('id', itemId)
    .eq('cartId', cartId)

  if (error) {
    throw new Error(`Failed to remove cart item: ${error.message}`)
  }

  await getCartTable()
    .update({ updatedAt: new Date().toISOString() } as Record<string, unknown>)
    .eq('id', cartId)
}

/**
 * Clear all items from cart
 */
export async function clearCart(cartId: string): Promise<void> {
  const { error } = await getCartItemTable()
    .delete()
    .eq('cartId', cartId)

  if (error) {
    throw new Error(`Failed to clear cart: ${error.message}`)
  }

  await getCartTable()
    .update({ updatedAt: new Date().toISOString() } as Record<string, unknown>)
    .eq('id', cartId)
}

/**
 * Get cart with all items
 */
export async function getCart(cartId: string): Promise<Cart | null> {
  const { data: cart, error } = await getCartTable()
    .select('*, CartItem(*)')
    .eq('id', cartId)
    .single()

  if (error || !cart) {
    return null
  }

  return rowToCart(cart as unknown as CartRow)
}

/**
 * Merge session cart into user cart
 */
export async function mergeCarts(
  sessionCartId: string,
  userCartId: string
): Promise<Cart> {
  const sessionCart = await getCart(sessionCartId)
  const userCart = await getCart(userCartId)

  if (!sessionCart || !userCart) {
    throw new Error('One or both carts not found')
  }

  if (sessionCart.items.length === 0) {
    await getCartTable().delete().eq('id', sessionCartId)
    return userCart
  }

  for (const sessionItem of sessionCart.items) {
    const existingUserItem = userCart.items.find(
      (item) => item.productId === sessionItem.productId
    )

    if (existingUserItem) {
      await updateCartItemQuantity(
        userCartId,
        existingUserItem.id,
        existingUserItem.quantity + sessionItem.quantity
      )
    } else {
      await addItemToCart(userCartId, sessionItem.productId, sessionItem.quantity)
    }
  }

  await getCartItemTable().delete().eq('cartId', sessionCartId)
  await getCartTable().delete().eq('id', sessionCartId)

  const mergedCart = await getCart(userCartId)
  if (!mergedCart) {
    throw new Error('Failed to retrieve merged cart')
  }

  return mergedCart
}
