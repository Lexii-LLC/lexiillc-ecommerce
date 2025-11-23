import { createFileRoute, Link, useParams, redirect } from '@tanstack/react-router'
import { useInfiniteQuery } from '@tanstack/react-query'
import React, { useState, useMemo, useEffect } from 'react'
import type { EnrichedInventoryItem } from '../types/inventory'
import { ShoppingBag, Loader2, AlertCircle, Search, Filter, X, ArrowLeft } from 'lucide-react'

export const Route = createFileRoute('/shop/$brand')({
  beforeLoad: ({ params }) => {
    const brand = decodeURIComponent(params.brand)
    // Check if it's a product ID (12+ chars, all uppercase/numbers)
    const isLikelyProductId = brand.length >= 12 && /^[A-Z0-9]+$/.test(brand)
    
    if (isLikelyProductId) {
      console.log('[BrandPage] beforeLoad: Redirecting product ID to product route')
      // Redirect to the product route using TanStack Router's redirect
      throw redirect({
        to: '/shop/$id',
        params: { id: params.brand },
        replace: true,
      })
    }
  },
  component: BrandShopPage,
})

type SortOption = 'price-low' | 'price-high' | 'name-asc' | 'name-desc' | 'newest'

function BrandShopPage() {
  const { brand: brandParam } = Route.useParams()
  const brand = decodeURIComponent(brandParam)

  // For brand page, we need all items to filter by brand
  // Use infinite query to load all items
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    error,
  } = useInfiniteQuery<{
    items: EnrichedInventoryItem[]
    total: number
    page: number
    pageSize: number
    totalPages: number
    hasMore: boolean
  }>({
    queryKey: ['inventory-paginated'],
    queryFn: async ({ pageParam = 1 }) => {
      const response = await fetch(`/api/inventory?page=${pageParam}&pageSize=100`)
      if (!response.ok) {
        throw new Error('Failed to fetch inventory')
      }
      return response.json()
    },
    getNextPageParam: (lastPage) => {
      return lastPage.hasMore ? lastPage.page + 1 : undefined
    },
    initialPageParam: 1,
  })

  // Flatten all loaded pages into a single array
  const inventory = useMemo(() => {
    if (!data) return []
    return data.pages.flatMap((page) => page.items)
  }, [data])

  // Load all items for brand filtering
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // Get all valid brand names from inventory
  const validBrands = useMemo(() => {
    if (!inventory) return new Set<string>()
    const brands = new Set(
      inventory
        .map((item) => item.brand)
        .filter((b): b is string => Boolean(b))
        .map((b) => b.toLowerCase())
    )
    return brands
  }, [inventory])

  // Secondary check: If it's not a valid brand but might be a product ID, redirect
  useEffect(() => {
    if (inventory && !isLoading && !error && inventory.length > 0) {
      const normalizedBrand = brand.toLowerCase()
      const isValidBrand = validBrands.has(normalizedBrand)
      
      // Check if it's a product ID by looking it up in inventory
      const isProductId = inventory.some((item) => item.id === brand || item.id === brandParam)
      
      if (isProductId && !isValidBrand) {
        // This is a product ID, redirect to product detail page
        navigate({ to: '/shop/$id', params: { id: brandParam }, replace: true })
      }
    }
  }, [inventory, brand, brandParam, validBrands, isLoading, error, navigate])

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedSize, setSelectedSize] = useState<string>('')
  const [minPrice, setMinPrice] = useState<number | ''>('')
  const [maxPrice, setMaxPrice] = useState<number | ''>('')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [showFilters, setShowFilters] = useState(false)

  // Map model names and variations to their parent brands
  const brandNormalization: Record<string, string> = {
    'af1': 'Nike',
    'air force': 'Nike',
    'air force 1': 'Nike',
    'dunk': 'Nike',
    'sb dunk': 'Nike',
    'lebron': 'Nike',
    'jumpman': 'Jordan',
    'yeezy': 'Adidas',
    'bapestas': 'Bape',
    'bapesta': 'Bape',
  }

  // Normalize brand name
  const normalizeBrand = (itemBrand: string): string => {
    const lowerBrand = itemBrand.toLowerCase().trim()
    if (brandNormalization[lowerBrand]) {
      return brandNormalization[lowerBrand]
    }
    return itemBrand
  }

  // Filter items by brand (including normalized model names)
  const brandItems = useMemo(() => {
    if (!inventory) return []
    const normalizedTargetBrand = brand.toLowerCase()
    return inventory.filter((item) => {
      if (!item.brand) return false
      const normalizedItemBrand = normalizeBrand(item.brand).toLowerCase()
      return normalizedItemBrand === normalizedTargetBrand
    })
  }, [inventory, brand])

  // Get unique sizes for this brand
  const sizes = useMemo(() => {
    const uniqueSizes = new Set(
      brandItems
        .map((item) => item.size)
        .filter((size): size is string => Boolean(size))
    )
    return Array.from(uniqueSizes).sort()
  }, [brandItems])

  // Filter and sort items
  const filteredAndSortedItems = useMemo(() => {
    let filtered = brandItems.filter((item) => {
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSearch =
          item.name.toLowerCase().includes(query) ||
          item.model?.toLowerCase().includes(query) ||
          item.colorway?.toLowerCase().includes(query)
        if (!matchesSearch) return false
      }

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
  }, [brandItems, searchQuery, selectedSize, minPrice, maxPrice, sortBy])

  const clearFilters = () => {
    setSearchQuery('')
    setSelectedSize('')
    setMinPrice('')
    setMaxPrice('')
  }

  const hasActiveFilters = selectedSize || minPrice !== '' || maxPrice !== '' || searchQuery

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
            {error instanceof Error ? error.message : 'An unknown error occurred'}
          </p>
          <Link
            to="/shop"
            className="inline-block px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Back to Shop
          </Link>
        </div>
      </div>
    )
  }

  if (brandItems.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h2 className="text-3xl font-bold mb-2">No {brand} Products Found</h2>
          <p className="text-gray-400 mb-6">
            We don't have any products from {brand} in our inventory right now.
          </p>
          <Link
            to="/shop"
            className="inline-block px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-100 transition-colors"
          >
            View All Products
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
          <div className="flex items-center gap-4 mb-6">
            <Link
              to="/shop"
              className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-medium"
            >
              <ArrowLeft className="w-5 h-5" />
              Back to Shop
            </Link>
          </div>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6 mb-6">
            <div>
              <h1 className="text-5xl md:text-6xl font-black mb-3 uppercase tracking-tight">
                {brand}
              </h1>
              <p className="text-gray-400 text-lg">
                {filteredAndSortedItems.length} of {brandItems.length} {brandItems.length === 1 ? 'item' : 'items'}
              </p>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder={`Search ${brand} products...`}
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
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
                    onChange={(e) => setMinPrice(e.target.value ? Number(e.target.value) : '')}
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
                    onChange={(e) => setMaxPrice(e.target.value ? Number(e.target.value) : '')}
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
                {hasActiveFilters ? 'No Items Match Your Filters' : 'No Items Available'}
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredAndSortedItems.map((item) => (
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
  return (
    <Link
      to={`/shop/${item.id}`}
      className="bg-gray-900 rounded-lg overflow-hidden border border-gray-800 hover:border-gray-600 transition-all duration-300 group hover:shadow-2xl hover:shadow-white/10 block"
    >
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
          <p className={`text-xs mt-2 font-medium ${item.stockCount > 0 ? 'text-green-400' : 'text-red-400'}`}>
            {item.stockCount > 0 ? `${item.stockCount} in stock` : 'Out of stock'}
          </p>
        )}
      </div>
    </Link>
  )
}
