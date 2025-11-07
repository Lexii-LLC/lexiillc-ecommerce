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
  size?: string
  price?: number
  stockCount?: number
  imageUrl?: string
  images?: string[]
  colorway?: string
  retailPrice?: number
  releaseDate?: string
  matched: boolean
  searchQuery: string
}

