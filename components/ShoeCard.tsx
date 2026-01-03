import Link from 'next/link'
import type { Product } from '@/lib/supabase/products'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

interface ShoeCardProps {
  product: Product
}

export function ShoeCard({ product }: ShoeCardProps) {
  // Format price from cents to dollars
  const formattedPrice = product.price
    ? `$${(product.price / 100).toFixed(2)}`
    : 'Price TBD'

  // Use clean name if available, fallback to raw name
  const displayName = product.clean_name || product.raw_name

  return (
    <Card className="group overflow-hidden bg-gray-900 border-gray-800 hover:border-gray-600 transition-all duration-300">
      {/* Image Placeholder */}
      <div className="aspect-square bg-gray-800 flex items-center justify-center">
        <div className="text-6xl opacity-30">👟</div>
      </div>

      <CardContent className="p-4">
        {/* Brand */}
        {product.clean_brand && (
          <p className="text-sm text-gray-400 uppercase tracking-wider mb-1">
            {product.clean_brand}
          </p>
        )}

        {/* Name */}
        <h3 className="font-bold text-white text-lg mb-2 line-clamp-2 group-hover:text-gray-200 transition-colors">
          {displayName}
        </h3>

        {/* Model & Colorway */}
        {(product.clean_model || product.clean_colorway) && (
          <p className="text-sm text-gray-400 mb-2">
            {product.clean_model}
            {product.clean_model && product.clean_colorway && ' • '}
            {product.clean_colorway}
          </p>
        )}

        {/* Size */}
        {product.clean_size && (
          <p className="text-sm text-gray-500">
            Size: {product.clean_size}
          </p>
        )}

        {/* Stock */}
        <p className={`text-sm mt-2 ${product.stock_quantity > 0 ? 'text-green-500' : 'text-red-500'}`}>
          {product.stock_quantity > 0 ? `${product.stock_quantity} in stock` : 'Out of stock'}
        </p>
      </CardContent>

      <CardFooter className="p-4 pt-0 flex items-center justify-between">
        <span className="text-2xl font-black text-white">
          {formattedPrice}
        </span>

        <Link href={`/shop/product/${product.clover_id}`}>
          <Button
            variant="secondary"
            size="sm"
            disabled={product.stock_quantity === 0}
          >
            View Details
          </Button>
        </Link>
      </CardFooter>
    </Card>
  )
}

export function ShoeCardSkeleton() {
  return (
    <Card className="overflow-hidden bg-gray-900 border-gray-800">
      <div className="aspect-square bg-gray-800 animate-pulse" />
      <CardContent className="p-4 space-y-3">
        <div className="h-3 bg-gray-800 rounded w-1/4 animate-pulse" />
        <div className="h-5 bg-gray-800 rounded w-3/4 animate-pulse" />
        <div className="h-3 bg-gray-800 rounded w-1/2 animate-pulse" />
      </CardContent>
      <CardFooter className="p-4 pt-0 flex items-center justify-between">
        <div className="h-7 bg-gray-800 rounded w-20 animate-pulse" />
        <div className="h-9 bg-gray-800 rounded w-24 animate-pulse" />
      </CardFooter>
    </Card>
  )
}
