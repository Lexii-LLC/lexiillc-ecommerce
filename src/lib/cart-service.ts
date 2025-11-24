import { supabase } from './supabase'
import type { EnrichedInventoryItem } from '../types/inventory'
import { MAX_CART_ITEMS, MAX_ITEM_QUANTITY, MAX_CARTS_PER_USER, MAX_SESSION_CARTS } from './cart-limits'

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
 * Get or create a cart for a user or session
 * If both userId and sessionId are provided, merges session cart into user cart
 */
export async function getOrCreateCart(
  userId?: string | null,
  sessionId?: string | null
): Promise<Cart> {
  // If user is authenticated, prioritize user cart
  if (userId) {
    // Find existing user cart
    const { data: existingUserCarts, error: userCartError } = await supabase
      .from('Cart')
      .select('*, CartItem(*)')
      .eq('userId', userId)
      .order('updatedAt', { ascending: false })
      .limit(1)

    let userCart: Cart | null = null
    if (!userCartError && existingUserCarts && existingUserCarts.length > 0) {
      const existingCart = existingUserCarts[0]
      userCart = {
        id: existingCart.id,
        userId: existingCart.userId,
        sessionId: existingCart.sessionId,
        items: (existingCart.CartItem || []).map((item: any) => ({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
        })),
        createdAt: new Date(existingCart.createdAt),
        updatedAt: new Date(existingCart.updatedAt),
      }
    }

    // If sessionId is also provided, check for session cart to merge
    if (sessionId) {
      const { data: existingSessionCarts, error: sessionCartError } = await supabase
        .from('Cart')
        .select('*, CartItem(*)')
        .eq('sessionId', sessionId)
        .is('userId', null)
        .order('updatedAt', { ascending: false })
        .limit(1)

      if (!sessionCartError && existingSessionCarts && existingSessionCarts.length > 0) {
        const sessionCart = existingSessionCarts[0]
        const sessionCartId = sessionCart.id

        if (userCart) {
          // Merge session cart into existing user cart
          return await mergeCarts(sessionCartId, userCart.id)
        } else {
          // Convert session cart to user cart by updating it
          const now = new Date().toISOString()
          const { data: updatedCart, error: updateError } = await supabase
            .from('Cart')
            .update({
              userId: userId,
              sessionId: null,
              updatedAt: now,
            })
            .eq('id', sessionCartId)
            .select('*, CartItem(*)')
            .single()

          if (updateError || !updatedCart) {
            throw new Error(`Failed to convert session cart to user cart: ${updateError?.message || 'Unknown error'}`)
          }

          return {
            id: updatedCart.id,
            userId: updatedCart.userId,
            sessionId: updatedCart.sessionId,
            items: (updatedCart.CartItem || []).map((item: any) => ({
              id: item.id,
              productId: item.productId,
              quantity: item.quantity,
            })),
            createdAt: new Date(updatedCart.createdAt),
            updatedAt: new Date(updatedCart.updatedAt),
          }
        }
      }
    }

    // If user cart exists, return it
    if (userCart) {
      return userCart
    }

    // Check total number of carts for this user and clean up old ones if needed
    const { data: allUserCarts } = await supabase
      .from('Cart')
      .select('id, updatedAt')
      .eq('userId', userId)
      .order('updatedAt', { ascending: false })

    if (allUserCarts && allUserCarts.length >= MAX_CARTS_PER_USER) {
      // Delete oldest carts, keeping only the most recent ones
      const cartsToDelete = allUserCarts.slice(MAX_CARTS_PER_USER - 1)
      const cartIdsToDelete = cartsToDelete.map((c) => c.id)
      
      // Delete cart items first, then carts
      if (cartIdsToDelete.length > 0) {
        await supabase.from('CartItem').delete().in('cartId', cartIdsToDelete)
        await supabase.from('Cart').delete().in('id', cartIdsToDelete)
      }
    }

    // Create new user cart
    const cartId = crypto.randomUUID()
    const now = new Date().toISOString()
    const { data: newCart, error } = await supabase
      .from('Cart')
      .insert({
        id: cartId,
        userId: userId,
        sessionId: null,
        createdAt: now,
        updatedAt: now,
      })
      .select('*, CartItem(*)')
      .single()

    if (error || !newCart) {
      throw new Error(`Failed to create cart: ${error?.message || 'Unknown error'}`)
    }

    return {
      id: newCart.id,
      userId: newCart.userId,
      sessionId: newCart.sessionId,
      items: (newCart.CartItem || []).map((item: any) => ({
        id: item.id,
        productId: item.productId,
        quantity: item.quantity,
      })),
      createdAt: new Date(newCart.createdAt),
      updatedAt: new Date(newCart.updatedAt),
    }
  }

  // For unauthenticated users, use sessionId
  if (sessionId) {
    const { data: existingCarts, error } = await supabase
      .from('Cart')
      .select('*, CartItem(*)')
      .eq('sessionId', sessionId)
      .is('userId', null)
      .order('updatedAt', { ascending: false })
      .limit(1)

    if (!error && existingCarts && existingCarts.length > 0) {
      const existingCart = existingCarts[0]
      return {
        id: existingCart.id,
        userId: existingCart.userId,
        sessionId: existingCart.sessionId,
        items: (existingCart.CartItem || []).map((item: any) => ({
          id: item.id,
          productId: item.productId,
          quantity: item.quantity,
        })),
        createdAt: new Date(existingCart.createdAt),
        updatedAt: new Date(existingCart.updatedAt),
      }
    }

    // Check total number of session carts and clean up old ones if needed
    const { data: allSessionCarts } = await supabase
      .from('Cart')
      .select('id, updatedAt')
      .eq('sessionId', sessionId)
      .is('userId', null)
      .order('updatedAt', { ascending: false })

    if (allSessionCarts && allSessionCarts.length >= MAX_SESSION_CARTS) {
      // Delete oldest carts, keeping only the most recent ones
      const cartsToDelete = allSessionCarts.slice(MAX_SESSION_CARTS - 1)
      const cartIdsToDelete = cartsToDelete.map((c) => c.id)
      
      // Delete cart items first, then carts
      if (cartIdsToDelete.length > 0) {
        await supabase.from('CartItem').delete().in('cartId', cartIdsToDelete)
        await supabase.from('Cart').delete().in('id', cartIdsToDelete)
      }
    }
  }

  // Create new session cart
  const cartId = crypto.randomUUID()
  const now = new Date().toISOString()
  const { data: newCart, error } = await supabase
    .from('Cart')
    .insert({
      id: cartId,
      userId: null,
      sessionId: sessionId || null,
      createdAt: now,
      updatedAt: now,
    })
    .select('*, CartItem(*)')
    .single()

  if (error || !newCart) {
    throw new Error(`Failed to create cart: ${error?.message || 'Unknown error'}`)
  }

  return {
    id: newCart.id,
    userId: newCart.userId,
    sessionId: newCart.sessionId,
    items: (newCart.CartItem || []).map((item: any) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
    })),
    createdAt: new Date(newCart.createdAt),
    updatedAt: new Date(newCart.updatedAt),
  }
}

/**
 * Add item to cart or update quantity if already exists
 */
export async function addItemToCart(
  cartId: string,
  productId: string,
  quantity: number = 1
): Promise<CartItem> {
  // Validate quantity
  if (quantity <= 0 || !Number.isInteger(quantity)) {
    throw new Error('Quantity must be a positive integer')
  }

  if (quantity > MAX_ITEM_QUANTITY) {
    throw new Error(`Quantity cannot exceed ${MAX_ITEM_QUANTITY} per item`)
  }

  // Get current cart to check item count
  const cart = await getCart(cartId)
  if (!cart) {
    throw new Error('Cart not found')
  }

  // Check if item already exists in cart
  const { data: existingItems, error: checkError } = await supabase
    .from('CartItem')
    .select('*')
    .eq('cartId', cartId)
    .eq('productId', productId)
    .limit(1)

  const existingItem = existingItems && existingItems.length > 0 ? existingItems[0] : null

  if (existingItem) {
    // Check if new quantity would exceed max
    const newQuantity = existingItem.quantity + quantity
    if (newQuantity > MAX_ITEM_QUANTITY) {
      throw new Error(`Total quantity cannot exceed ${MAX_ITEM_QUANTITY} per item`)
    }

    // Update quantity and cart's updatedAt
    const { data: updated, error } = await supabase
      .from('CartItem')
      .update({ quantity: newQuantity })
      .eq('id', existingItem.id)
      .select()
      .single()

    // Update cart's updatedAt timestamp
    await supabase
      .from('Cart')
      .update({ updatedAt: new Date().toISOString() })
      .eq('id', cartId)

    if (error || !updated) {
      throw new Error(`Failed to update cart item: ${error?.message || 'Unknown error'}`)
    }

    return {
      id: updated.id,
      productId: updated.productId,
      quantity: updated.quantity,
    }
  }

  // Check if cart has reached max items
  if (cart.items.length >= MAX_CART_ITEMS) {
    throw new Error(`Cart cannot have more than ${MAX_CART_ITEMS} items`)
  }

  // Create new item with generated ID
  const itemId = crypto.randomUUID()
  const { data: newItem, error } = await supabase
    .from('CartItem')
    .insert({
      id: itemId,
      cartId,
      productId,
      quantity,
    })
    .select()
    .single()

  if (error || !newItem) {
    throw new Error(`Failed to add item to cart: ${error?.message || 'Unknown error'}`)
  }

  // Update cart's updatedAt timestamp
  await supabase
    .from('Cart')
    .update({ updatedAt: new Date().toISOString() })
    .eq('id', cartId)

  return {
    id: newItem.id,
    productId: newItem.productId,
    quantity: newItem.quantity,
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

  // Verify item belongs to cart
  const { data: item } = await supabase
    .from('CartItem')
    .select('*')
    .eq('id', itemId)
    .eq('cartId', cartId)
    .single()

  if (!item) {
    throw new Error('Cart item not found or does not belong to this cart')
  }

  const { data: updated, error } = await supabase
    .from('CartItem')
    .update({ quantity })
    .eq('id', itemId)
    .eq('cartId', cartId)
    .select()
    .single()

  // Update cart's updatedAt timestamp
  await supabase
    .from('Cart')
    .update({ updatedAt: new Date().toISOString() })
    .eq('id', cartId)

  if (error || !updated) {
    throw new Error(`Failed to update cart item: ${error?.message || 'Unknown error'}`)
  }

  return {
    id: updated.id,
    productId: updated.productId,
    quantity: updated.quantity,
  }
}

/**
 * Remove item from cart
 */
export async function removeCartItem(cartId: string, itemId: string): Promise<void> {
  const { error } = await supabase
    .from('CartItem')
    .delete()
    .eq('id', itemId)
    .eq('cartId', cartId)

  if (error) {
    throw new Error(`Failed to remove cart item: ${error.message}`)
  }

  // Update cart's updatedAt timestamp
  await supabase
    .from('Cart')
    .update({ updatedAt: new Date().toISOString() })
    .eq('id', cartId)
}

/**
 * Clear all items from cart
 */
export async function clearCart(cartId: string): Promise<void> {
  const { error } = await supabase
    .from('CartItem')
    .delete()
    .eq('cartId', cartId)

  if (error) {
    throw new Error(`Failed to clear cart: ${error.message}`)
  }

  // Update cart's updatedAt timestamp
  await supabase
    .from('Cart')
    .update({ updatedAt: new Date().toISOString() })
    .eq('id', cartId)
}

/**
 * Get cart with all items
 */
export async function getCart(cartId: string): Promise<Cart | null> {
  const { data: cart, error } = await supabase
    .from('Cart')
    .select('*, CartItem(*)')
    .eq('id', cartId)
    .single()

  if (error || !cart) {
    return null
  }

  return {
    id: cart.id,
    userId: cart.userId,
    sessionId: cart.sessionId,
    items: (cart.CartItem || []).map((item: any) => ({
      id: item.id,
      productId: item.productId,
      quantity: item.quantity,
    })),
    createdAt: new Date(cart.createdAt),
    updatedAt: new Date(cart.updatedAt),
  }
}

/**
 * Merge session cart into user cart
 * Combines quantities for items with the same productId
 * Deletes the session cart after merging
 */
export async function mergeCarts(sessionCartId: string, userCartId: string): Promise<Cart> {
  // Get both carts
  const sessionCart = await getCart(sessionCartId)
  const userCart = await getCart(userCartId)

  if (!sessionCart || !userCart) {
    throw new Error('One or both carts not found')
  }

  // If session cart has no items, just delete it and return user cart
  if (sessionCart.items.length === 0) {
    await supabase.from('Cart').delete().eq('id', sessionCartId)
    return userCart
  }

  // Merge items: combine quantities for same products, add new items
  for (const sessionItem of sessionCart.items) {
    // Check if user cart already has this product
    const existingUserItem = userCart.items.find(
      (item) => item.productId === sessionItem.productId
    )

    if (existingUserItem) {
      // Update quantity by adding session item quantity
      await updateCartItemQuantity(
        userCartId,
        existingUserItem.id,
        existingUserItem.quantity + sessionItem.quantity
      )
    } else {
      // Add new item to user cart
      await addItemToCart(userCartId, sessionItem.productId, sessionItem.quantity)
    }
  }

  // Delete session cart
  await supabase.from('CartItem').delete().eq('cartId', sessionCartId)
  await supabase.from('Cart').delete().eq('id', sessionCartId)

  // Return updated user cart
  const mergedCart = await getCart(userCartId)
  if (!mergedCart) {
    throw new Error('Failed to retrieve merged cart')
  }

  return mergedCart
}