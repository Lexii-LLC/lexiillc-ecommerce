'use client'

import { useQuery } from '@tanstack/react-query'
import type { Product } from '../supabase/products'

interface ProductsResponse {
  items: Product[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasMore: boolean
}

interface ProductsMetadata {
  total: number
  inStock: number
  normalized: number
  brands: string[]
}

interface UseProductsOptions {
  page?: number
  pageSize?: number
  brand?: string
}

/**
 * Fetch paginated products from the API
 */
async function fetchProducts(options: UseProductsOptions = {}): Promise<ProductsResponse> {
  const { page = 1, pageSize = 50, brand } = options
  const params = new URLSearchParams({
    page: page.toString(),
    pageSize: pageSize.toString(),
  })

  if (brand) {
    params.set('brand', brand)
  }

  const response = await fetch(`/api/inventory?${params}`)
  if (!response.ok) {
    throw new Error('Failed to fetch products')
  }
  return response.json()
}

/**
 * Fetch products metadata (brands, totals)
 */
async function fetchProductsMetadata(): Promise<ProductsMetadata> {
  const response = await fetch('/api/inventory?all=true')
  if (!response.ok) {
    throw new Error('Failed to fetch metadata')
  }
  return response.json()
}

/**
 * Fetch a single product by Clover ID
 */
async function fetchProduct(id: string): Promise<Product> {
  const response = await fetch(`/api/inventory/${encodeURIComponent(id)}`)
  if (!response.ok) {
    throw new Error('Failed to fetch product')
  }
  return response.json()
}

/**
 * Hook to fetch paginated products
 */
export function useProducts(options: UseProductsOptions = {}) {
  return useQuery({
    queryKey: ['products', options],
    queryFn: () => fetchProducts(options),
  })
}

/**
 * Hook to fetch products metadata (brands, counts)
 */
export function useProductsMetadata() {
  return useQuery({
    queryKey: ['products', 'metadata'],
    queryFn: fetchProductsMetadata,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

/**
 * Hook to fetch a single product
 */
export function useProduct(id: string) {
  return useQuery({
    queryKey: ['product', id],
    queryFn: () => fetchProduct(id),
    enabled: !!id,
  })
}
