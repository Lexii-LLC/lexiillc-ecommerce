import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import type { EnrichedInventoryItem } from '../types/inventory'
import { ArrowLeft, ShoppingBag, Loader2, AlertCircle, Calendar } from 'lucide-react'

export const Route = createFileRoute('/shop/$id')({
  component: ProductDetailPage,
})

function ProductDetailPage() {
  const { id } = Route.useParams()
  
  const { data: inventory, isLoading, error } = useQuery<EnrichedInventoryItem[]>({
    queryKey: ['inventory'],
    queryFn: async () => {
      const response = await fetch('/api/inventory')
      if (!response.ok) {
        throw new Error('Failed to fetch inventory')
      }
      return response.json()
    },
  })

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
            {error instanceof Error ? error.message : 'An unknown error occurred'}
          </p>
          <Link
            to="/shop"
            className="inline-block px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Back to Products
          </Link>
        </div>
      </div>
    )
  }

  const product = inventory?.find((item) => item.id === id)

  if (!product) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center px-6">
        <div className="text-center max-w-md">
          <ShoppingBag className="w-16 h-16 mx-auto mb-4 text-gray-600" />
          <h2 className="text-3xl font-bold mb-2">Product Not Found</h2>
          <p className="text-gray-400 mb-6">
            The product you're looking for doesn't exist or has been removed.
          </p>
          <Link
            to="/shop"
            className="inline-block px-6 py-3 bg-white text-black font-bold rounded-lg hover:bg-gray-100 transition-colors"
          >
            Back to Products
          </Link>
        </div>
      </div>
    )
  }

  const images = product.images && product.images.length > 0 
    ? product.images 
    : product.imageUrl 
      ? [product.imageUrl] 
      : []

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Back Button */}
      <div className="border-b border-gray-800 py-6 px-4 md:px-16">
        <div className="max-w-7xl mx-auto">
          <Link
            to="/shop"
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
                    alt={product.name}
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
                        alt={`${product.name} view ${index + 2}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Product Info */}
            <div className="flex flex-col justify-center space-y-6 pt-8 lg:pt-0">
              {product.brand && (
                <p className="text-gray-400 text-sm uppercase tracking-wider font-medium">
                  {product.brand}
                </p>
              )}
              
              <h1 className="text-4xl md:text-5xl font-black uppercase tracking-tight leading-tight">
                {product.model || product.name}
              </h1>

              {product.colorway && (
                <p className="text-xl text-gray-300">
                  {product.colorway}
                </p>
              )}

              {/* Price */}
              <div className="pt-4 border-t border-gray-800">
                {product.price !== undefined ? (
                  <div className="flex items-baseline gap-4">
                    <p className="text-5xl font-black text-white">
                      ${(product.price / 100).toFixed(2)}
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

              {/* Product Details */}
              <div className="space-y-4 pt-4 border-t border-gray-800">
                {product.size && (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 font-medium min-w-[80px]">Size:</span>
                    <span className="text-white font-bold text-lg">{product.size}</span>
                  </div>
                )}

                {product.stockCount !== undefined && (
                  <div className="flex items-center gap-3">
                    <span className="text-gray-400 font-medium min-w-[80px]">Stock:</span>
                    {product.stockCount > 0 ? (
                      <span className="text-green-400 font-bold">
                        {product.stockCount} {product.stockCount === 1 ? 'item' : 'items'} available
                      </span>
                    ) : (
                      <span className="text-red-400 font-bold">Out of Stock</span>
                    )}
                  </div>
                )}

                {product.releaseDate && (
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-400 font-medium min-w-[80px]">Release:</span>
                    <span className="text-white">{product.releaseDate}</span>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-6 space-y-4">
                <button 
                  disabled
                  className="w-full px-8 py-5 bg-gray-800 text-gray-500 font-bold rounded-lg cursor-not-allowed text-lg uppercase tracking-wider"
                >
                  View Mode - Purchases Coming Soon
                </button>
                
                <a
                  href={`mailto:LexiiLLC24@gmail.com?subject=Inquiry about ${encodeURIComponent(product.name)}&body=Hi Lexii,%0D%0A%0D%0AI'm interested in learning more about: ${encodeURIComponent(product.name)}%0D%0A%0D%0A`}
                  className="block w-full px-8 py-5 border-2 border-white hover:bg-white hover:text-black text-white font-bold rounded-lg transition-all duration-300 text-lg uppercase tracking-wider active:scale-[0.98] text-center"
                >
                  Contact Us
                </a>
              </div>

              {/* Additional Info */}
              <div className="pt-6 border-t border-gray-800">
                <p className="text-gray-400 text-sm leading-relaxed">
                  Shop online and pick up in-store at our Modesto, CA location at Vintage Faire Mall.
                  All items are authenticated and in excellent condition.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

