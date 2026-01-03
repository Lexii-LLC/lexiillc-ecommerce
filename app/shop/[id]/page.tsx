'use client'

import { use, useState, useEffect } from 'react'
import Link from 'next/link'
import useSWR from 'swr'
import type { EnrichedInventoryItem, ProductVariant } from '@/types/inventory'
import {
  ArrowLeft,
  ShoppingBag,
  Loader2,
  AlertCircle,
  Calendar,
} from 'lucide-react'
import AddToCartButton from '@/components/AddToCartButton'

const fetcher = (url: string) => fetch(url).then(async (res) => {
  if (!res.ok) {
    const errorText = await res.text()
    let errorMessage = `Failed to fetch product: ${res.status}`
    try {
      const errorData = JSON.parse(errorText)
      errorMessage = errorData.error || errorData.message || errorMessage
    } catch {
      if (errorText) errorMessage = errorText
    }
    if (res.status === 404) {
      throw new Error('Product not found')
    }
    throw new Error(errorMessage)
  }
  const data = await res.json()
  if (!data || !data.id) {
    throw new Error('Invalid product data received')
  }
  return data
})

interface ProductDetailPageProps {
  params: Promise<{ id: string }>
}


export default function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { id } = use(params)
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null)

  // Decode and re-encode to handle special characters
  const decodedId = decodeURIComponent(id)
  const encodedId = encodeURIComponent(decodedId)

  const {
    data: product,
    isLoading,
    error,
  } = useSWR<EnrichedInventoryItem>(
    `/api/inventory/${encodedId}`,
    fetcher,
    { revalidateOnFocus: false }
  )

  // Set default variant when product loads
  useEffect(() => {
    if (product?.variants && product.variants.length > 0) {
      // Find first in-stock variant or default to first
      const firstInStock = product.variants.find(v => v.stock_quantity > 0)
      setSelectedVariant(firstInStock || product.variants[0])
    }
  }, [product])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-white" />
          <p className="text-gray-400 text-lg">Loading product...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h2 className="text-2xl font-bold mb-2">Error Loading Product</h2>
          <p className="text-gray-400 mb-6">
            {error instanceof Error
              ? error.message
              : 'An unknown error occurred'}
          </p>
          <Link
            href="/shop"
            className="inline-block px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Back to Products
          </Link>
        </div>
      </div>
    )
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h2 className="text-3xl font-bold mb-2">Product Not Found</h2>
          <p className="text-gray-400 mb-6">
            The product you&apos;re looking for doesn&apos;t exist or has been
            removed.
          </p>
          <Link
            href="/shop"
            className="inline-block px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Back to Products
          </Link>
        </div>
      </div>
    )
  }

  const images =
    product.images && product.images.length > 0
      ? product.images
      : product.imageUrl
        ? [product.imageUrl]
        : []

  const displayName = product.clean_name || product.raw_name || product.name || 'Unknown Product'
  const displayBrand = product.clean_brand || product.brand
  const displayModel = product.clean_model || product.model
  const displayColorway = product.clean_model ? product.clean_colorway : product.colorway

  // Price logic: use selected variant price, fallback to product price
  const price = selectedVariant?.price ?? product.price
  const stockCount = selectedVariant?.stock_quantity ?? product.stockCount ?? 0

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Back Button */}
      <div className="border-b border-gray-800 py-6 px-4 md:px-16">
        <div className="max-w-7xl mx-auto">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Products
          </Link>
        </div>
      </div>

      {/* Product Content */}
      <div className="py-12 px-4 md:px-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-16">
            {/* Image Gallery */}
            <div className="space-y-4">
              <div className="aspect-square bg-gray-900 rounded-lg overflow-hidden border border-gray-800 group">
                {images.length > 0 ? (
                  <img
                    src={images[0]}
                    alt={displayName}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="eager"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ShoppingBag className="w-32 h-32 text-gray-600" />
                  </div>
                )}
              </div>
              {images.length > 1 && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {images.slice(1, 5).map((image, index) => (
                    <div
                      key={index}
                      className="aspect-square bg-gray-900 rounded-lg overflow-hidden border border-gray-800 hover:border-gray-600 transition-colors cursor-pointer group"
                    >
                      <img
                        src={image}
                        alt={`${displayName} view ${index + 2}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex flex-col justify-center space-y-6 pt-8 lg:pt-0">
              {displayBrand && (
                <p className="text-gray-400 text-sm uppercase tracking-wider font-medium">
                  {displayBrand}
                </p>
              )}

              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight leading-tight">
                {outputDisplayModel(displayModel, displayName)}
              </h1>

              {displayColorway && (
                <p className="text-xl text-gray-300">{displayColorway}</p>
              )}

              {/* Price */}
              <div className="pt-4 border-t border-gray-800">
                {price !== undefined ? (
                  <div className="flex items-baseline gap-4">
                    <p className="text-5xl font-black text-white">
                      ${(price / 100).toFixed(2)}
                    </p>
                    {product.retailPrice && product.retailPrice > 0 && (
                      <p className="text-xl text-gray-500 line-through">
                        ${product.retailPrice.toFixed(2)} MSRP
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-2xl text-gray-400">Price not available</p>
                )}
              </div>

              {/* Variant / Size Selector */}
              {product.variants && product.variants.length > 0 ? (
                 <div className="pt-4 space-y-3">
                   <div className="flex justify-between items-center">
                     <span className="text-gray-400 font-medium uppercase text-sm tracking-wider">Select Size</span>
                     {selectedVariant && (
                       <span className="text-white font-bold">{selectedVariant.size}</span>
                     )}
                   </div>
                   <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2">
                     {product.variants.map((variant) => (
                       <button
                         key={variant.id}
                         onClick={() => setSelectedVariant(variant)}
                         disabled={variant.stock_quantity === 0}
                         className={`
                           px-2 py-3 border rounded-lg font-bold text-sm transition-all duration-200
                           ${selectedVariant?.id === variant.id 
                             ? 'bg-white text-black border-white ring-2 ring-white/50' 
                             : variant.stock_quantity === 0
                               ? 'bg-gray-900 text-gray-600 border-gray-800 cursor-not-allowed opacity-50'
                               : 'bg-transparent text-white border-gray-700 hover:border-gray-500 hover:bg-gray-800'
                           }
                         `}
                       >
                         {variant.size}
                       </button>
                     ))}
                   </div>
                 </div>
              ) : (
                /* Single Item Details (Legacy/No variants) */
                <div className="space-y-4 pt-4">
                    {product.size && (
                      <div className="flex items-center gap-3">
                        <span className="text-gray-400 font-medium min-w-[80px]">
                          Size:
                        </span>
                        <span className="text-white font-bold text-lg">
                          {product.size}
                        </span>
                      </div>
                    )}
                </div>
              )}

              {/* Stock Status */}
              <div className="space-y-4 pt-4">
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 font-medium min-w-[80px]">
                      Stock:
                    </span>
                    {stockCount > 0 ? (
                      <span className="text-green-400 font-bold">
                        {stockCount}{' '}
                        {stockCount === 1 ? 'item' : 'items'} available
                      </span>
                    ) : (
                      <span className="text-red-400 font-bold">
                        Out of Stock
                      </span>
                    )}
                  </div>

                {product.releaseDate && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-400 font-medium min-w-[80px]">
                      Release:
                    </span>
                    <span className="text-white">{product.releaseDate}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-6 space-y-4">
                <AddToCartButton
                  productId={selectedVariant ? selectedVariant.id : product.id}
                  disabled={stockCount === 0}
                  className="w-full text-lg"
                />

                <a
                  href={`mailto:LexiiLLC24@gmail.com?subject=Inquiry about ${encodeURIComponent(displayName)}&body=Hi Lexii,%0D%0A%0D%0AI'm interested in learning more about: ${encodeURIComponent(displayName)}%0D%0A%0D%0A`}
                  className="block w-full px-8 py-5 border-2 border-white hover:bg-white hover:text-black text-white font-bold rounded-lg transition-all duration-300 text-lg uppercase tracking-wider active:scale-[0.98] text-center"
                >
                  Contact Us
                </a>
              </div>

              {/* Additional Info */}
              <div className="pt-6 border-t border-gray-800">
                <p className="text-gray-400 text-sm leading-relaxed">
                  Shop online and pick up in-store at our Modesto, CA location
                  at Vintage Faire Mall. All items are authenticated and in
                  excellent condition.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function outputDisplayModel(model?: string, name?: string) {
  return model || name || 'Unknown Product'
}

