/**
 * Cart limits to prevent excessive record creation
 * These limits help protect against abuse and stay within free tier limits
 */

// Maximum number of items allowed in a single cart
export const MAX_CART_ITEMS = 50

// Maximum quantity allowed per cart item
export const MAX_ITEM_QUANTITY = 10

// Maximum number of carts a user can have (we'll clean up old ones)
export const MAX_CARTS_PER_USER = 5

// Maximum number of session carts (for unauthenticated users)
export const MAX_SESSION_CARTS = 3
