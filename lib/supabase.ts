import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Cart row with items from the database
export interface CartRow {
  id: string
  userId: string | null
  sessionId: string | null
  createdAt: string
  updatedAt: string
  CartItem?: CartItemRow[]
}

export interface CartItemRow {
  id: string
  cartId: string
  productId: string
  quantity: number
}

/**
 * Creates a Supabase client for use in API routes and lib files.
 * This client uses the anon key and is suitable for server-side operations
 * that don't require user context.
 */
export function getSupabaseClient(): SupabaseClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

// Export a singleton instance for backwards compatibility
export const supabase = getSupabaseClient()
