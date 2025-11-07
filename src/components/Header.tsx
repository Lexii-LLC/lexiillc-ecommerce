import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import type { EnrichedInventoryItem } from '../types/inventory';

import ClerkHeader from '../integrations/clerk/header-user.tsx';

import { Home, ShoppingBag, ChevronDown } from 'lucide-react';

export default function Header() {
  const [isShopHovered, setIsShopHovered] = useState(false);

  const { data: inventory } = useQuery<EnrichedInventoryItem[]>({
    queryKey: ['inventory'],
    queryFn: async () => {
      const response = await fetch('/api/inventory')
      if (!response.ok) {
        throw new Error('Failed to fetch inventory')
      }
      return response.json()
    },
  })

  // Whitelist of legitimate shoe manufacturers
  const validBrands = [
    'Nike',
    'Adidas',
    'Jordan',
    'Air Jordan',
    'New Balance',
    'Puma',
    'Reebok',
    'Vans',
    'Converse',
    'Asics',
    'Bape',
    'A Bathing Ape',
    'Supreme',
    'Vlone',
  ]

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
  const normalizeBrand = (brand: string): string => {
    const lowerBrand = brand.toLowerCase().trim()
    // Check if it's a model name that should map to a parent brand
    if (brandNormalization[lowerBrand]) {
      return brandNormalization[lowerBrand]
    }
    // Return as-is if it's already a valid brand
    return brand
  }

  // Get unique manufacturers (filtered to only valid brands)
  const manufacturers = useMemo(() => {
    if (!inventory) return []
    const normalizedBrands = inventory
      .map((item) => {
        if (!item.brand) return null
        return normalizeBrand(item.brand)
      })
      .filter((brand): brand is string => {
        if (!brand) return false
        // Check if normalized brand matches any valid brand (case-insensitive)
        return validBrands.some(
          (validBrand) => validBrand.toLowerCase() === brand.toLowerCase()
        )
      })
    
    const uniqueBrands = new Set(normalizedBrands)
    return Array.from(uniqueBrands).sort((a, b) => {
      // Sort by the order in validBrands list, then alphabetically
      const indexA = validBrands.findIndex((vb) => vb.toLowerCase() === a.toLowerCase())
      const indexB = validBrands.findIndex((vb) => vb.toLowerCase() === b.toLowerCase())
      if (indexA !== -1 && indexB !== -1) return indexA - indexB
      if (indexA !== -1) return -1
      if (indexB !== -1) return 1
      return a.localeCompare(b)
    })
  }, [inventory])

  return (
    <header className="py-4 px-4 md:px-16 flex items-center justify-between bg-black text-white shadow-lg relative z-50">
      <div className="flex items-center gap-4">
        <Link to="/">
          <img
            src="https://portal.lexiillc.com/assets/logo-dbf3009d.jpg"
            alt="Lexii Logo"
            className="h-16"
          />
        </Link>
        <Link
          to="/"
          className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors"
          activeProps={{
            className:
              'flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors',
          }}
        >
          <Home size={20} />
          <span className="font-medium">Home</span>
        </Link>
        <div
          className="relative"
          onMouseEnter={() => setIsShopHovered(true)}
          onMouseLeave={() => setIsShopHovered(false)}
        >
          <Link
            to="/shop"
            className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors"
            activeProps={{
              className:
                'flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors bg-gray-900',
            }}
          >
            <ShoppingBag size={20} />
            <span className="font-medium">Shop</span>
            <ChevronDown size={16} className={`transition-transform duration-200 ${isShopHovered ? 'rotate-180' : ''}`} />
          </Link>
          
          {/* Dropdown Menu */}
          {isShopHovered && manufacturers.length > 0 && (
            <div className="absolute top-full left-0 mt-2 w-48 bg-gray-900 border border-gray-800 rounded-lg shadow-2xl overflow-hidden">
              <div className="py-2">
                <Link
                  to="/shop"
                  className="block px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
                >
                  All Products
                </Link>
                <div className="border-t border-gray-800 my-1" />
                {manufacturers.map((brand) => (
                  <Link
                    key={brand}
                    to={`/shop/${encodeURIComponent(brand)}`}
                    className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                  >
                    {brand}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      <div>
        <ClerkHeader />
      </div>
    </header>
  )
}
