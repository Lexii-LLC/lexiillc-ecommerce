/**
 * Supabase Products Service
 * Handles CRUD operations for the normalized products cache
 */

import { createClient } from '@supabase/supabase-js'

// Types
export interface Product {
  id: string
  clover_id: string
  raw_name: string
  clean_name: string | null
  clean_brand: string | null
  clean_model: string | null
  clean_size: string | null
  clean_colorway: string | null
  price: number | null
  stock_quantity: number
  is_normalized: boolean
  last_synced: string
  created_at: string
  updated_at: string
}

export interface ProductInsert {
  clover_id: string
  raw_name: string
  clean_name?: string
  clean_brand?: string
  clean_model?: string
  clean_size?: string
  clean_colorway?: string
  price?: number
  stock_quantity?: number
  is_normalized?: boolean
}

export interface ProductUpdate {
  raw_name?: string
  clean_name?: string
  clean_brand?: string
  clean_model?: string
  clean_size?: string
  clean_colorway?: string
  price?: number
  stock_quantity?: number
  is_normalized?: boolean
  last_synced?: string
}

export interface ProductFilters {
  brand?: string
  minPrice?: number
  maxPrice?: number
  inStock?: boolean
  isNormalized?: boolean
  limit?: number
  offset?: number
}

// Create a Supabase client with service role for server-side operations
function getServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseServiceKey)
}

// Create a Supabase client with anon key for public reads
function getPublicClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables')
  }

  return createClient(supabaseUrl, supabaseAnonKey)
}

/**
 * Get all products with optional filtering
 */
export async function getProducts(filters?: ProductFilters): Promise<Product[]> {
  const supabase = getPublicClient()

  let query = supabase
    .from('products')
    .select('*')
    .order('clean_brand', { ascending: true })
    .order('clean_model', { ascending: true })

  if (filters?.brand) {
    query = query.ilike('clean_brand', filters.brand)
  }

  if (filters?.minPrice !== undefined) {
    query = query.gte('price', filters.minPrice)
  }

  if (filters?.maxPrice !== undefined) {
    query = query.lte('price', filters.maxPrice)
  }

  if (filters?.inStock) {
    query = query.gt('stock_quantity', 0)
  }

  if (filters?.isNormalized !== undefined) {
    query = query.eq('is_normalized', filters.isNormalized)
  }

  if (filters?.limit) {
    query = query.limit(filters.limit)
  }

  if (filters?.offset) {
    query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1)
  }

  const { data, error } = await query

  if (error) {
    console.error('Error fetching products:', error)
    throw error
  }

  return data || []
}

/**
 * Get a single product by Clover ID
 */
export async function getProductByCloverById(cloverId: string): Promise<Product | null> {
  const supabase = getPublicClient()

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('clover_id', cloverId)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching product:', error)
    throw error
  }

  return data
}

/**
 * Upsert a product (insert or update by clover_id)
 */
export async function upsertProduct(product: ProductInsert): Promise<Product> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('products')
    .upsert(
      {
        ...product,
        last_synced: new Date().toISOString(),
      },
      {
        onConflict: 'clover_id',
      }
    )
    .select()
    .single()

  if (error) {
    console.error('Error upserting product:', error)
    throw error
  }

  return data
}

/**
 * Batch upsert multiple products
 */
export async function upsertProducts(products: ProductInsert[]): Promise<number> {
  const supabase = getServiceClient()

  const productsWithTimestamp = products.map((p) => ({
    ...p,
    last_synced: new Date().toISOString(),
  }))

  const { error, count } = await supabase
    .from('products')
    .upsert(productsWithTimestamp, {
      onConflict: 'clover_id',
      count: 'exact',
    })

  if (error) {
    console.error('Error batch upserting products:', error)
    throw error
  }

  return count || 0
}

/**
 * Update a product by Clover ID
 */
export async function updateProductByCloverById(
  cloverId: string,
  updates: ProductUpdate
): Promise<Product | null> {
  const supabase = getServiceClient()

  const { data, error } = await supabase
    .from('products')
    .update({
      ...updates,
      last_synced: new Date().toISOString(),
    })
    .eq('clover_id', cloverId)
    .select()
    .single()

  if (error) {
    console.error('Error updating product:', error)
    throw error
  }

  return data
}

/**
 * Update stock quantity for a product
 */
export async function updateProductStock(
  cloverId: string,
  stockQuantity: number
): Promise<void> {
  const supabase = getServiceClient()

  const { error } = await supabase
    .from('products')
    .update({
      stock_quantity: stockQuantity,
      last_synced: new Date().toISOString(),
    })
    .eq('clover_id', cloverId)

  if (error) {
    console.error('Error updating product stock:', error)
    throw error
  }
}

/**
 * Get products that haven't been normalized yet
 */
export async function getUnnormalizedProducts(limit = 100): Promise<Product[]> {
  const supabase = getPublicClient()

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('is_normalized', false)
    .limit(limit)

  if (error) {
    console.error('Error fetching unnormalized products:', error)
    throw error
  }

  return data || []
}

/**
 * Get unique brands from normalized products
 */
export async function getUniqueBrands(): Promise<string[]> {
  const supabase = getPublicClient()

  const { data, error } = await supabase
    .from('products')
    .select('clean_brand')
    .eq('is_normalized', true)
    .not('clean_brand', 'is', null)

  if (error) {
    console.error('Error fetching brands:', error)
    throw error
  }

  const brands = new Set<string>()
  data?.forEach((row) => {
    if (row.clean_brand) {
      brands.add(row.clean_brand)
    }
  })

  return Array.from(brands).sort()
}

/**
 * Get product count statistics
 */
export async function getProductStats(): Promise<{
  total: number
  normalized: number
  inStock: number
}> {
  const supabase = getPublicClient()

  const [totalResult, normalizedResult, inStockResult] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }),
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_normalized', true),
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .gt('stock_quantity', 0),
  ])

  return {
    total: totalResult.count || 0,
    normalized: normalizedResult.count || 0,
    inStock: inStockResult.count || 0,
  }
}
