// Clover API Types
export interface CloverItem {
  id: string
  name: string
  price?: number
  priceType?: string
  defaultTaxRates?: boolean
  unitName?: string
  cost?: number
  isRevenue?: boolean
  stockCount?: number
  modifiedTime?: number
  [key: string]: unknown
}

// Parsed Shoe Data
export interface ParsedShoe {
  brand: string
  model: string
  size?: string
  originalName: string
  searchQuery: string
}

// KicksDB API Types
export interface KicksDBProduct {
  id?: string
  name?: string
  brand?: string
  model?: string
  colorway?: string
  imageUrl?: string
  images?: string[]
  retailPrice?: number
  releaseDate?: string
  [key: string]: unknown
}

export interface KicksDBSearchResponse {
  products?: KicksDBProduct[]
  total?: number
  [key: string]: unknown
}

// Enriched Inventory Item (Final Display Format)
export interface EnrichedInventoryItem {
  id: string
  name: string
  originalName: string
  brand: string
  model: string
  size?: string // Sneaker sizes (7y, 8.5w, 12) or apparel sizes (S, M, L, XL, 2XL)
  color?: string // Color for variants
  variant?: string // For non-apparel items (e.g., "Macaron", "Strawberry")
  price?: number
  stockCount?: number
  imageUrl?: string
  image_url?: string // Snake case from Supabase
  images?: string[]
  colorway?: string
  retailPrice?: number
  releaseDate?: string
  matched: boolean
  searchQuery: string
  variants?: ProductVariant[]
  // Support for raw supabase fields if needed
  raw_name?: string
  clover_id?: string
  clean_name?: string
  clean_model?: string
  clean_brand?: string
  clean_size?: string
  clean_colorway?: string
  is_parent?: boolean
}

export interface ProductVariant {
  id: string
  product_id: string
  clover_item_id: string
  size?: string
  color?: string
  condition?: string
  variant_number?: string
  price?: number
  stock_quantity: number
  updated_at: string
}
