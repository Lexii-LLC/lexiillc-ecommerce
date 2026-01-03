'use client'

import { use } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import { useState, useMemo, useEffect, useCallback } from 'react'
import type { EnrichedInventoryItem } from '@/types/inventory'
import {
  ShoppingBag,
  Loader2,
  AlertCircle,
  Search,
  ArrowLeft,
} from 'lucide-react'
import AddToCartButton from '@/components/AddToCartButton'

interface PaginatedResponse {
  items: EnrichedInventoryItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasMore: boolean
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface BrandShopPageProps {
  params: Promise<{ brand: string }>
}

export default function BrandShopPage({ params }: BrandShopPageProps) {
  const { brand } = use(params)
  const decodedBrand = decodeURIComponent(brand)
  const pageSize = 50

  // Fetch products
  const { data, isLoading, error } = useSWR<PaginatedResponse>(
    `/api/inventory?page=1&pageSize=${pageSize}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  const [searchQuery, setSearchQuery] = useState('')

  // Filter items by brand
  const filteredItems = useMemo(() => {
    if (!data?.items) return []

    return data.items.filter((item) => {
      // Brand filter
      if (
        item.brand?.toLowerCase() !== decodedBrand.toLowerCase()
      ) {
        return false
      }

      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          item.name.toLowerCase().includes(query) ||
          item.model?.toLowerCase().includes(query) ||
          item.colorway?.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }

      return true
    })
  }, [data, decodedBrand, searchQuery])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-white" />
          <p className="text-gray-400 text-lg">Loading {decodedBrand} products...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold mb-2">Error Loading Products</h2>
          <p className="text-gray-400 mb-6">
            {error instanceof Error ? error.message : 'An unknown error occurred'}
          </p>
          <Link
            href="/shop"
            className="inline-block px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Back to Shop
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800 py-8 px-4 md:px-16">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-medium mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to All Products
          </Link>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
            <div>
              <h1 className="text-5xl md:text-6xl font-black mb-3 uppercase tracking-tight">
                {decodedBrand}
              </h1>
              <p className="text-gray-400 text-lg">
                {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mt-6">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={`Search ${decodedBrand} products...`}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Products Grid */}
      <div className="py-12 px-4 md:px-16">
        <div className="max-w-7xl mx-auto">
          {filteredItems.length === 0 ? (
            <div className="text-center py-20">
              <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h2 className="text-2xl font-bold mb-2 text-gray-400">
                No {decodedBrand} Products Found
              </h2>
              <p className="text-gray-500 mb-6">
                {searchQuery
                  ? 'Try adjusting your search.'
                  : 'Check back soon for new inventory.'}
              </p>
              <Link
                href="/shop"
                className="px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-100 transition-colors"
              >
                View All Products
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredItems.map((item) => (
                <ProductCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ProductCard({ item }: { item: EnrichedInventoryItem }) {
  const handleAddToCartClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }

  return (
    <div className="bg-gray-900 rounded-lg overflow-hidden border border-gray-800 hover:border-gray-600 transition-all duration-300 group hover:shadow-2xl hover:shadow-white/10">
      <Link href={`/shop/${item.id}`} className="block">
        {/* Image */}
        <div className="aspect-square bg-gray-800 relative overflow-hidden">
          {item.imageUrl ? (
            <>
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                loading="lazy"
                decoding="async"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="w-24 h-24 text-gray-600" />
            </div>
          )}
          {item.stockCount !== undefined && item.stockCount > 0 && (
            <div className="absolute top-3 left-3 bg-green-500 text-white text-xs px-2 py-1 rounded font-bold">
              In Stock
            </div>
          )}
        </div>

        {/* Details */}
        <div className="p-5">
          {item.brand && (
            <p className="text-gray-400 text-xs uppercase tracking-wider mb-1 font-medium">
              {item.brand}
            </p>
          )}
          <h3 className="font-bold text-lg mb-2 line-clamp-2 text-white group-hover:text-gray-200 transition-colors">
            {item.model || item.name}
          </h3>
          {item.size && (
            <p className="text-gray-500 text-sm mb-3">
              Size: <span className="text-white font-medium">{item.size}</span>
            </p>
          )}
          {item.price !== undefined ? (
            <p className="text-white text-2xl font-black mb-1">
              ${(item.price / 100).toFixed(2)}
            </p>
          ) : (
            <p className="text-gray-500 text-sm">Price not available</p>
          )}
        </div>
      </Link>
      <div className="p-5 pt-0" onClick={handleAddToCartClick}>
        <AddToCartButton
          productId={item.id}
          disabled={item.stockCount === 0}
          className="w-full"
          variant="outline"
        />
      </div>
    </div>
  )
}
