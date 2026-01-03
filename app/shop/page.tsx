'use client'

import Link from 'next/link'
import useSWR from 'swr'
import useSWRInfinite from 'swr/infinite'
import { useState, useMemo, useEffect, useCallback } from 'react'
import type { EnrichedInventoryItem } from '@/types/inventory'
import {
  ShoppingBag,
  Loader2,
  AlertCircle,
  Search,
  Filter,
  X,
} from 'lucide-react'
import AddToCartButton from '@/components/AddToCartButton'

type SortOption =
  | 'price-low'
  | 'price-high'
  | 'name-asc'
  | 'name-desc'
  | 'newest'

interface PaginatedResponse {
  items: EnrichedInventoryItem[]
  total: number
  page: number
  pageSize: number
  totalPages: number
  hasMore: boolean
}

interface MetadataResponse {
  total: number
  brands: string[]
  sizes: string[]
}

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function ShopPage() {
  const pageSize = 50

  // Fetch metadata (brands, sizes) separately
  const { data: metadata } = useSWR<MetadataResponse>(
    '/api/inventory?all=true',
    fetcher
  )

  // Generate keys for infinite loading
  const getKey = (pageIndex: number, previousPageData: PaginatedResponse | null) => {
    if (previousPageData && !previousPageData.hasMore) return null
    return `/api/inventory?page=${pageIndex + 1}&pageSize=${pageSize}`
  }

  // Fetch products with infinite scroll
  const {
    data,
    size,
    setSize,
    isLoading,
    isValidating,
    error,
  } = useSWRInfinite<PaginatedResponse>(getKey, fetcher, {
    revalidateOnFocus: false,
    revalidateFirstPage: false,
  })

  // Flatten all loaded pages into a single array
  const inventory = useMemo(() => {
    if (!data) return []
    return data.flatMap((page) => page.items)
  }, [data])

  const hasNextPage = data ? data[data.length - 1]?.hasMore : false
  const isFetchingNextPage = isValidating && data && data.length > 0

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedBrand, setSelectedBrand] = useState<string>('')
  const [selectedSize, setSelectedSize] = useState<string>('')
  const [minPrice, setMinPrice] = useState<number | ''>('')
  const [maxPrice, setMaxPrice] = useState<number | ''>('')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [showFilters, setShowFilters] = useState(false)

  // Use metadata for brands and sizes
  const brands = useMemo(() => {
    return metadata?.brands || []
  }, [metadata])

  const sizes = useMemo(() => {
    return metadata?.sizes || []
  }, [metadata])

  // Load more function
  const loadMore = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) {
      setSize(size + 1)
    }
  }, [hasNextPage, isFetchingNextPage, setSize, size])

  // Infinite scroll: load more when user scrolls near bottom
  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + window.scrollY >=
        document.documentElement.scrollHeight - 1000
      ) {
        loadMore()
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [loadMore])

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    if (!inventory) return []

    let filtered = inventory.filter((item) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          item.name.toLowerCase().includes(query) ||
          item.brand?.toLowerCase().includes(query) ||
          item.model?.toLowerCase().includes(query) ||
          item.colorway?.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }

      // Brand filter
      if (selectedBrand && item.brand !== selectedBrand) return false

      // Size filter
      if (selectedSize && item.size !== selectedSize) return false

      // Price filters
      if (item.price !== undefined) {
        if (minPrice !== '' && item.price < minPrice * 100) return false
        if (maxPrice !== '' && item.price > maxPrice * 100) return false
      }

      return true
    })

    // Sort items
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return (a.price || 0) - (b.price || 0)
        case 'price-high':
          return (b.price || 0) - (a.price || 0)
        case 'name-asc':
          return (a.name || '').localeCompare(b.name || '')
        case 'name-desc':
          return (b.name || '').localeCompare(a.name || '')
        case 'newest':
        default:
          return 0
      }
    })

    return filtered
  }, [
    inventory,
    searchQuery,
    selectedBrand,
    selectedSize,
    minPrice,
    maxPrice,
    sortBy,
  ])

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedBrand('')
    setSelectedSize('')
    setMinPrice('')
    setMaxPrice('')
  }

  const hasActiveFilters =
    selectedBrand ||
    selectedSize ||
    minPrice !== '' ||
    maxPrice !== '' ||
    searchQuery

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-white" />
          <p className="text-gray-400 text-lg">Loading inventory...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold mb-2">Error Loading Inventory</h2>
          <p className="text-gray-400 mb-6">
            {error instanceof Error
              ? error.message
              : 'An unknown error occurred'}
          </p>
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Return Home
          </Link>
        </div>
      </div>
    )
  }

  const items = inventory || []

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="border-b border-gray-800 py-8 px-4 md:px-16">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-6">
            <div>
              <h1 className="text-5xl md:text-6xl font-black mb-3 uppercase tracking-tight">
                Shop
              </h1>
              <p className="text-gray-400 text-lg">
                {filteredAndSortedItems.length} of {items.length}{' '}
                {items.length === 1 ? 'item' : 'items'}
              </p>
            </div>
            <Link
              href="/"
              className="px-6 py-3 border-2 border-white rounded-lg hover:bg-white hover:text-black transition-all duration-300 font-medium self-start md:self-auto"
            >
              Back to Home
            </Link>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name, brand, or model..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-gray-900 border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
            />
          </div>

          {/* Filter Toggle and Sort */}
          <div className="flex flex-wrap items-center gap-4">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-6 py-3 bg-gray-900 border border-gray-800 rounded-lg hover:bg-gray-800 transition-colors font-medium"
            >
              <Filter className="w-5 h-5" />
              Filters
              {hasActiveFilters && (
                <span className="bg-white text-black text-xs px-2 py-0.5 rounded-full font-bold">
                  Active
                </span>
              )}
            </button>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="px-6 py-3 bg-gray-900 border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gray-600 transition-colors cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="price-low">Price: Low to High</option>
              <option value="price-high">Price: High to Low</option>
              <option value="name-asc">Name: A to Z</option>
              <option value="name-desc">Name: Z to A</option>
            </select>

            {hasActiveFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-2 px-4 py-3 text-gray-400 hover:text-white transition-colors text-sm"
              >
                <X className="w-4 h-4" />
                Clear Filters
              </button>
            )}
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <div className="mt-6 p-6 bg-gray-900 border border-gray-800 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Brand Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wider">
                    Brand
                  </label>
                  <select
                    value={selectedBrand}
                    onChange={(e) => setSelectedBrand(e.target.value)}
                    className="w-full px-4 py-3 bg-black border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gray-600 transition-colors cursor-pointer"
                  >
                    <option value="">All Brands</option>
                    {brands.map((brand) => (
                      <option key={brand} value={brand}>
                        {brand}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Size Filter */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wider">
                    Size
                  </label>
                  <select
                    value={selectedSize}
                    onChange={(e) => setSelectedSize(e.target.value)}
                    className="w-full px-4 py-3 bg-black border border-gray-800 rounded-lg text-white focus:outline-none focus:border-gray-600 transition-colors cursor-pointer"
                  >
                    <option value="">All Sizes</option>
                    {sizes.map((size) => (
                      <option key={size} value={size}>
                        {size}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Min Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wider">
                    Min Price ($)
                  </label>
                  <input
                    type="number"
                    placeholder="0"
                    value={minPrice}
                    onChange={(e) =>
                      setMinPrice(e.target.value ? Number(e.target.value) : '')
                    }
                    className="w-full px-4 py-3 bg-black border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
                  />
                </div>

                {/* Max Price */}
                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wider">
                    Max Price ($)
                  </label>
                  <input
                    type="number"
                    placeholder="10000"
                    value={maxPrice}
                    onChange={(e) =>
                      setMaxPrice(e.target.value ? Number(e.target.value) : '')
                    }
                    className="w-full px-4 py-3 bg-black border border-gray-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-gray-600 transition-colors"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Products Grid */}
      <div className="py-12 px-4 md:px-16">
        <div className="max-w-7xl mx-auto">
          {filteredAndSortedItems.length === 0 ? (
            <div className="text-center py-20">
              <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-600" />
              <h2 className="text-2xl font-bold mb-2 text-gray-400">
                {hasActiveFilters
                  ? 'No Items Match Your Filters'
                  : 'No Items Available'}
              </h2>
              <p className="text-gray-500 mb-6">
                {hasActiveFilters
                  ? 'Try adjusting your search or filters.'
                  : 'Check back soon for new inventory.'}
              </p>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-100 transition-colors"
                >
                  Clear All Filters
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredAndSortedItems.map((item) => (
                  <ProductCard key={item.id} item={item} />
                ))}
              </div>
              {isFetchingNextPage && (
                <div className="flex justify-center items-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-white" />
                  <p className="ml-4 text-gray-400">Loading more products...</p>
                </div>
              )}
              {!hasNextPage && filteredAndSortedItems.length > 0 && (
                <div className="text-center py-12">
                  <p className="text-gray-400">
                    Showing all {filteredAndSortedItems.length} of{' '}
                    {metadata?.total || 0} products
                  </p>
                </div>
              )}
            </>
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
                width={400}
                height={400}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </>
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <ShoppingBag className="w-24 h-24 text-gray-600" />
            </div>
          )}
          {!item.matched && (
            <div className="absolute top-3 right-3 bg-yellow-500 text-black text-xs px-2 py-1 rounded font-bold">
              No Image
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
          {item.stockCount !== undefined && (
            <p
              className={`text-xs mt-2 font-medium ${item.stockCount > 0 ? 'text-green-400' : 'text-red-400'}`}
            >
              {item.stockCount > 0
                ? `${item.stockCount} in stock`
                : 'Out of stock'}
            </p>
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
