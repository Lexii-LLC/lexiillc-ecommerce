'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { useCart } from '@/hooks/useCart'
import {
  Loader2,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  ArrowLeft,
} from 'lucide-react'
import type { EnrichedInventoryItem } from '@/types/inventory'

const _fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function CartPage() {
  const {
    cart,
    isLoading,
    itemCount,
    updateQuantity,
    removeItem,
  } = useCart()

  // Get product IDs for fetching details
  const productIds = cart?.items.map((item) => item.productId) || []

  // Fetch all product details
  const { data: products } = useSWR<EnrichedInventoryItem[]>(
    productIds.length > 0
      ? `/api/inventory-batch?ids=${productIds.join(',')}`
      : null,
    // Fall back to fetching individually if batch doesn't exist
    async () => {
      if (productIds.length === 0) return []
      const promises = productIds.map((id) =>
        fetch(`/api/inventory/${encodeURIComponent(id)}`).then((res) =>
          res.ok ? res.json() : null
        )
      )
      return (await Promise.all(promises)).filter(Boolean)
    },
    { revalidateOnFocus: false }
  )

  // Map products to items
  const cartItemsWithProducts =
    cart?.items.map((item) => {
      const product = products?.find((p) => p?.id === item.productId)
      return { ...item, product }
    }) || []

  // Calculate subtotal based on products
  const subtotal = cartItemsWithProducts.reduce((sum, item) => {
    if (item.product?.price) {
      return sum + item.product.price * item.quantity
    }
    return sum
  }, 0)

  if (isLoading && !cart) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin mx-auto mb-4 text-white" />
          <p className="text-gray-400 text-lg">Loading cart...</p>
        </div>
      </div>
    )
  }

  if (!cart || cartItemsWithProducts.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white">
        <div className="max-w-7xl mx-auto px-4 md:px-16 py-12">
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-medium mb-8"
          >
            <ArrowLeft className="w-5 h-5" />
            Continue Shopping
          </Link>

          <div className="text-center py-20">
            <ShoppingBag className="w-24 h-24 mx-auto mb-6 text-gray-600" />
            <h2 className="text-3xl font-bold mb-4">Your cart is empty</h2>
            <p className="text-gray-400 mb-8">
              Start adding some products to your cart!
            </p>
            <Link
              href="/shop"
              className="inline-block px-8 py-4 bg-white text-black font-bold rounded-lg hover:bg-gray-100 transition-colors"
            >
              Browse Products
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="max-w-7xl mx-auto px-4 md:px-16 py-12">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-4xl font-black uppercase">Shopping Cart</h1>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 text-gray-400 hover:text-white transition-colors font-medium"
          >
            <ArrowLeft className="w-5 h-5" />
            Continue Shopping
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItemsWithProducts.map((item) => (
              <div
                key={item.id}
                className="bg-gray-900 rounded-lg border border-gray-800 p-6 flex gap-6"
              >
                {/* Product Image */}
                <div className="w-32 h-32 bg-gray-800 rounded-lg overflow-hidden flex-shrink-0">
                  {(item.product?.imageUrl || item.product?.image_url) ? (
                    <img
                      src={item.product?.imageUrl || item.product?.image_url}
                      alt={item.product?.clean_name || item.product?.name || 'Product'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ShoppingBag className="w-12 h-12 text-gray-600" />
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <Link
                      href={`/shop/${item.productId}`}
                      className="text-xl font-bold hover:text-gray-300 transition-colors"
                    >
                      {item.product?.clean_name || item.product?.name || 'Product'}
                    </Link>
                    {(item.product?.clean_brand || item.product?.brand) && (
                      <p className="text-gray-400 text-sm mt-1">
                        {item.product?.clean_brand || item.product?.brand}
                      </p>
                    )}
                    {/* Show size and color for variants */}
                    {(item.product?.size || item.product?.color) && (
                      <p className="text-gray-500 text-sm mt-1">
                        {item.product?.color && <span>{item.product.color}</span>}
                        {item.product?.color && item.product?.size && <span> / </span>}
                        {item.product?.size && <span>Size {item.product.size}</span>}
                      </p>
                    )}
                    {item.product?.price && (
                      <p className="text-2xl font-bold mt-2">
                        $
                        {((item.product.price * item.quantity) / 100).toFixed(
                          2
                        )}
                      </p>
                    )}
                  </div>

                  {/* Quantity Controls */}
                  <div className="flex items-center gap-4 mt-4">
                    <div className="flex items-center gap-2 border border-gray-700 rounded-lg">
                      <button
                        onClick={() => {
                          if (item.quantity > 1) {
                            updateQuantity(item.id, item.quantity - 1)
                          }
                        }}
                        disabled={item.quantity <= 1}
                        className="p-2 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="px-4 py-2 font-bold min-w-[3rem] text-center">
                        {item.quantity}
                      </span>
                      {(() => {
                        // Stock can be in stockCount (products) or stock_quantity (variants)
                        const product = item.product as EnrichedInventoryItem & { stock_quantity?: number } | undefined
                        const maxStock = product?.stockCount ?? product?.stock_quantity ?? 99
                        const atMaxStock = item.quantity >= maxStock
                        return (
                          <button
                            onClick={() =>
                              updateQuantity(item.id, item.quantity + 1)
                            }
                            disabled={atMaxStock}
                            title={atMaxStock ? 'Maximum stock reached' : `${maxStock - item.quantity} more available`}
                            className="p-2 hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        )
                      })()}
                    </div>

                    <button
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-red-400 hover:text-red-300 hover:bg-gray-800 rounded-lg transition-colors"
                      aria-label="Remove item"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <div className="bg-gray-900 rounded-lg border border-gray-800 p-6 sticky top-8">
              <h2 className="text-2xl font-bold mb-6 uppercase">
                Order Summary
              </h2>

              <div className="space-y-4 mb-6">
                <div className="flex justify-between text-gray-400">
                  <span>Items ({itemCount})</span>
                  <span>${(subtotal / 100).toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-800 pt-4">
                  <div className="flex justify-between text-xl font-bold">
                    <span>Total</span>
                    <span>${(subtotal / 100).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <button
                disabled
                className="w-full px-6 py-4 bg-gray-800 text-gray-500 font-bold rounded-lg cursor-not-allowed uppercase tracking-wider"
              >
                Checkout (Coming Soon)
              </button>

              <p className="text-gray-400 text-sm mt-4 text-center">
                Checkout will be available soon for authenticated users
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
