'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import useSWR from 'swr'
import { useMemo, useState } from 'react'

import AuthButton from './AuthButton'
import CartIcon from './CartIcon'

import { Home, ShoppingBag, ChevronDown } from 'lucide-react'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function Header() {
  const [isShopHovered, setIsShopHovered] = useState(false)
  const pathname = usePathname()

  // Fetch metadata for brands list (lightweight)
  const { data: metadata } = useSWR<{ brands: string[] }>(
    '/api/inventory?all=true',
    fetcher
  )

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
    af1: 'Nike',
    'air force': 'Nike',
    'air force 1': 'Nike',
    dunk: 'Nike',
    'sb dunk': 'Nike',
    lebron: 'Nike',
    jumpman: 'Jordan',
    yeezy: 'Adidas',
    bapestas: 'Bape',
    bapesta: 'Bape',
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
    if (!metadata?.brands) return []
    const normalizedBrands = metadata.brands
      .map((brand: string) => normalizeBrand(brand))
      .filter((brand: string): brand is string => {
        if (!brand) return false
        // Check if normalized brand matches any valid brand (case-insensitive)
        return validBrands.some(
          (validBrand) => validBrand.toLowerCase() === brand.toLowerCase()
        )
      })

    const uniqueBrands = new Set(normalizedBrands)
    return Array.from(uniqueBrands).sort((a: string, b: string) => {
      // Sort by the order in validBrands list, then alphabetically
      const indexA = validBrands.findIndex(
        (vb) => vb.toLowerCase() === a.toLowerCase()
      )
      const indexB = validBrands.findIndex(
        (vb) => vb.toLowerCase() === b.toLowerCase()
      )
      if (indexA !== -1 && indexB !== -1) return indexA - indexB
      if (indexA !== -1) return -1
      if (indexB !== -1) return 1
      return a.localeCompare(b)
    }) as string[]
  }, [metadata, normalizeBrand, validBrands])

  const isActive = (path: string) => pathname === path
  const isShopActive = pathname.startsWith('/shop')

  return (
    <header className="py-4 px-4 md:px-16 flex items-center justify-between bg-black text-white shadow-lg relative z-50">
      <div className="flex items-center gap-4">
        <Link href="/">
          <img
            src="https://portal.lexiillc.com/assets/logo-dbf3009d.jpg"
            alt="Lexii Logo"
            className="h-16"
          />
        </Link>
        <Link
          href="/"
          className={`flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors ${
            isActive('/') ? 'bg-gray-900' : ''
          }`}
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
            href="/shop"
            className={`flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors ${
              isShopActive ? 'bg-gray-900' : ''
            }`}
          >
            <ShoppingBag size={20} />
            <span className="font-medium">Shop</span>
            <ChevronDown
              size={16}
              className={`transition-transform duration-200 ${
                isShopHovered ? 'rotate-180' : ''
              }`}
            />
          </Link>

          {/* Dropdown Menu */}
          {isShopHovered && manufacturers && manufacturers.length > 0 && (
            <div className="absolute top-full left-0 pt-2 w-48">
              <div className="bg-gray-900 border border-gray-800 rounded-lg shadow-2xl overflow-hidden">
                <div className="py-2">
                  <Link
                    href="/shop"
                    className="block px-4 py-2 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
                  >
                    All Products
                  </Link>
                  <div className="border-t border-gray-800 my-1" />
                  {manufacturers.map((brand) => (
                    <Link
                      key={brand}
                      href={`/shop/brand/${encodeURIComponent(brand)}`}
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                    >
                      {brand}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-4">
        <CartIcon />
        <AuthButton />
      </div>
    </header>
  )
}
