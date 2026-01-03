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
  product_type: 'sneaker' | 'apparel' | 'accessory' | 'other' | null
  price: number | null
  stock_quantity: number
  is_normalized: boolean
  is_parent: boolean
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
  product_type?: 'sneaker' | 'apparel' | 'accessory' | 'other'
  price?: number
  stock_quantity?: number
  is_normalized?: boolean
  is_parent?: boolean
}

export interface ProductUpdate {
  raw_name?: string
  clean_name?: string
  clean_brand?: string
  clean_model?: string
  clean_size?: string
  clean_colorway?: string
  product_type?: 'sneaker' | 'apparel' | 'accessory' | 'other'
  price?: number
  stock_quantity?: number
  is_normalized?: boolean
  is_parent?: boolean
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

  // Only show parents in main list (unless specific override, but for now strict)
  // We assume that if isNormalized is true, we only want parents.
  // If isNormalized is NOT specified, we might get raw items?
  // Let's enforce is_parent for the main shop query which usually sets isNormalized=true.
  if (filters?.isNormalized) {
     query = query.eq('is_parent', true)
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
    .gt('stock_quantity', 0)
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
      .eq('is_normalized', true)
      .eq('is_parent', true),
    supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .gt('stock_quantity', 0)
      .eq('is_parent', true),
  ])

  return {
    total: totalResult.count || 0,
    normalized: normalizedResult.count || 0,
    inStock: inStockResult.count || 0,
  }
}

/**
 * Check if a parent product exists, if so return it
 */
export async function findParentProduct(
  brand: string,
  model: string,
  colorway?: string
): Promise<Product | null> {
  const supabase = getPublicClient()

  let query = supabase
    .from('products')
    .select('*')
    .eq('is_parent', true)
    .eq('clean_brand', brand)
    .eq('clean_model', model)

  if (colorway) {
    query = query.eq('clean_colorway', colorway)
  }

  // Safety: Limit 1
  const { data, error } = await query.limit(1).maybeSingle()

  if (error) {
    console.error('Error finding parent product:', error)
    return null
  }

  return data
}

/**
 * Insert a variant for a product
 */
export async function insertVariant(variant: {
  product_id: string
  clover_item_id: string
  size?: string
  color?: string
  condition?: string
  variant_number?: string
  price?: number
  stock_quantity: number
}) {
  const supabase = getServiceClient()

  const { error } = await supabase.from('product_variants').upsert(
    {
      ...variant,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'clover_item_id' }
  )

  if (error) {
    console.error('Error upserting variant:', error)
    throw error
  }
}

/**
 * Get a single product by UUID (for Parents or specific items)
 */
export async function getProductById(id: string): Promise<Product | null> {
  const supabase = getPublicClient()

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code === 'PGRST116') {
      return null // Not found
    }
    console.error('Error fetching product by ID:', error)
    throw error
  }

  return data
}

/**
 * Get variants for a parent product
 */
export async function getProductVariants(parentId: string) {
  const supabase = getPublicClient()

  const { data, error } = await supabase
    .from('product_variants')
    .select('*')
    .eq('product_id', parentId)
    .gt('stock_quantity', 0) // Only want in-stock variants for display
    .order('size', { ascending: true }) // Naive sort, migth need custom sort for shoes

  if (error) {
    console.error('Error fetching variants:', error)
    return []
  }

  return data || []
}

/**
 * Update parent stock based on sum of variants
 */
export async function updateParentStock(parentId: string): Promise<void> {
  const supabase = getServiceClient()

  // 1. Get sum of stock from variants
  const { data: variants, error: fetchError } = await supabase
    .from('product_variants')
    .select('stock_quantity')
    .eq('product_id', parentId)

  if (fetchError) {
    console.error('Error fetching variants for stock update:', fetchError)
    return
  }

  const totalStock = variants?.reduce((sum, v) => sum + v.stock_quantity, 0) || 0

  // 2. Update parent product
  const { error: updateError } = await supabase
    .from('products')
    .update({ 
      stock_quantity: totalStock,
      last_synced: new Date().toISOString()
    })
    .eq('id', parentId)

  if (updateError) {
    console.error('Error updating parent stock:', updateError)
  } else {
    // console.log(`Updated parent ${parentId} stock to ${totalStock}`)
  }
}
