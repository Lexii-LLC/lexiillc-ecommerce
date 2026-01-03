'use client'

import { useState } from 'react'
import { useCart } from '@/hooks/useCart'
import { Loader2, ShoppingCart } from 'lucide-react'

interface AddToCartButtonProps {
  productId: string
  disabled?: boolean
  className?: string
  variant?: 'default' | 'outline'
}

export default function AddToCartButton({
  productId,
  disabled = false,
  className = '',
  variant = 'default',
}: AddToCartButtonProps) {
  const { addToCart, isLoading } = useCart()
  const [isAdding, setIsAdding] = useState(false)

  const handleAddToCart = async () => {
    if (disabled || isAdding) return

    setIsAdding(true)
    try {
      await addToCart(productId, 1)
      // Reset after a brief delay to show success
      setTimeout(() => setIsAdding(false), 500)
    } catch (error) {
      console.error('Failed to add to cart:', error)
      setIsAdding(false)
    }
  }

  const baseClasses =
    'px-6 py-3 font-bold rounded-lg transition-all duration-300 uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed'

  const variantClasses =
    variant === 'outline'
      ? 'border-2 border-white hover:bg-white hover:text-black text-white'
      : 'bg-white text-black hover:bg-gray-100'

  return (
    <button
      onClick={handleAddToCart}
      disabled={disabled || isAdding || isLoading}
      className={`${baseClasses} ${variantClasses} ${className}`}
    >
      {isAdding || isLoading ? (
        <>
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Adding...</span>
        </>
      ) : (
        <>
          <ShoppingCart className="w-5 h-5" />
          <span>Add to Cart</span>
        </>
      )}
    </button>
  )
}
