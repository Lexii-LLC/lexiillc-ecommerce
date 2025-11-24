import { Link } from '@tanstack/react-router'
import { ShoppingCart } from 'lucide-react'
import { useCart } from '../hooks/useCart'

export default function CartIcon() {
  const { itemCount } = useCart()

  return (
    <Link
      to="/cart"
      className="relative inline-flex items-center justify-center p-2 hover:bg-gray-800 rounded-lg transition-colors"
      aria-label={`Shopping cart with ${itemCount} items`}
    >
      <ShoppingCart className="w-6 h-6 text-white" />
      {itemCount > 0 && (
        <span className="absolute -top-1 -right-1 bg-white text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {itemCount > 99 ? '99+' : itemCount}
        </span>
      )}
    </Link>
  )
}

