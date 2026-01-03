'use client'

import Link from 'next/link'
import useSWR from 'swr'
import { MapPin, Zap, ShoppingBag, ArrowRight, Loader2 } from 'lucide-react'
import { useMemo } from 'react'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function HomePage() {
  return (
    <div className="min-h-screen bg-black text-white">
      {/* Hero Section */}
      <section className="relative min-h-[90vh] flex items-center justify-center px-6 text-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0 z-0">
          <div
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: 'url(/jordan-4-hero.png)',
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/80 via-black/70 to-black/90" />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-6xl mx-auto">
          <h1 className="text-7xl md:text-9xl font-black mb-8 tracking-tight animate-fade-in">
            <span className="text-white drop-shadow-2xl">LEXII</span>
          </h1>
          <p className="text-4xl md:text-6xl text-white mb-8 font-bold drop-shadow-lg leading-tight">
            The Hottest Sneakers in the Market
          </p>
          <p className="text-xl md:text-2xl text-gray-200 max-w-3xl mx-auto mb-8 drop-shadow-md">
            Discover premium sneakers from the most sought-after brands. Shop
            online, pick up in-store.
          </p>
          <Link
            href="/shop"
            className="inline-block px-12 py-6 bg-white hover:bg-gray-100 text-black font-bold rounded-lg transition-all duration-300 text-lg uppercase tracking-wider shadow-2xl hover:shadow-white/20 hover:scale-105"
          >
            Shop Now
          </Link>
        </div>
      </section>

      {/* About Section */}
      <section className="py-20 px-6 bg-gray-950">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-6xl font-black mb-6 uppercase tracking-tight">
              About Lexii
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold text-white mb-4 uppercase tracking-tight">
                Premium Sneakers, Authentic Quality
              </h3>
              <p className="text-lg text-gray-300 mb-4 leading-relaxed">
                At Lexii, we specialize in bringing you the hottest sneakers on
                the market right now. We curate our inventory to feature only
                the most sought-after releases and trending styles that everyone
                is talking about.
              </p>
              <p className="text-lg text-gray-300 mb-4 leading-relaxed">
                What sets us apart? We offer only authentic, premium sneakers
                from top-tier brands. Every pair in our collection is carefully
                selected for quality, style, and exclusivity.
              </p>
              <p className="text-lg text-gray-300 leading-relaxed">
                Located in the heart of Modesto, CA at Vintage Faire Mall, we
                make it easy to shop online and pick up in-store. Experience the
                convenience of browsing our curated selection from home, then
                swing by to grab your perfect pair.
              </p>
            </div>
            <div className="space-y-6">
              <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
                <h4 className="text-xl font-bold text-white mb-2 uppercase">
                  Hot Market Picks
                </h4>
                <p className="text-gray-400">
                  We stay on top of the latest trends and stock the sneakers
                  everyone wants right now.
                </p>
              </div>
              <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
                <h4 className="text-xl font-bold text-white mb-2 uppercase">
                  Premium Quality
                </h4>
                <p className="text-gray-400">
                  Only authentic, top-tier sneakers from the world&apos;s most
                  respected brands. Every pair is verified for quality.
                </p>
              </div>
              <div className="p-6 bg-gray-900 rounded-lg border border-gray-800">
                <h4 className="text-xl font-bold text-white mb-2 uppercase">
                  Easy Shopping
                </h4>
                <p className="text-gray-400">
                  Browse online, reserve your pair, and pick it up at our
                  Modesto location. Simple and convenient.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Manufacturers Section */}
      <ManufacturersSection />

      {/* Features Section */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Pickup Feature */}
            <div className="text-center group">
              <div className="mb-8 flex justify-center">
                <div className="p-4 rounded-full bg-gray-900 group-hover:bg-gray-800 transition-colors duration-300">
                  <Zap className="w-12 h-12 text-white" />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-white mb-4 uppercase tracking-tight">
                Pickup
              </h3>
              <p className="text-gray-400 leading-relaxed text-lg">
                Buy online, pickup in-store.
              </p>
            </div>

            {/* Location Feature */}
            <div className="text-center group">
              <div className="mb-8 flex justify-center">
                <div className="p-4 rounded-full bg-gray-900 group-hover:bg-gray-800 transition-colors duration-300">
                  <MapPin className="w-12 h-12 text-white" />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-white mb-4 uppercase tracking-tight">
                Modesto, CA
              </h3>
              <p className="text-gray-400 leading-relaxed text-lg">
                Located at Vintage Faire Mall.
              </p>
            </div>

            {/* Shoe Focus Feature */}
            <div className="text-center group">
              <div className="mb-8 flex justify-center">
                <div className="p-4 rounded-full bg-gray-900 group-hover:bg-gray-800 transition-colors duration-300">
                  <ShoppingBag className="w-12 h-12 text-white" />
                </div>
              </div>
              <h3 className="text-3xl font-bold text-white mb-4 uppercase tracking-tight">
                The Inventory
              </h3>
              <p className="text-gray-400 leading-relaxed text-lg">
                The best selection in the Central Valley.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA Section */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-6xl font-black mb-6 uppercase tracking-tight">
            Ready to Find Your Perfect Pair?
          </h2>
          <p className="text-xl text-gray-400 mb-10">
            Browse our curated collection of premium sneakers from the
            world&apos;s top brands.
          </p>
          <Link
            href="/shop"
            className="inline-flex items-center gap-2 px-10 py-5 bg-white hover:bg-gray-100 text-black font-bold rounded-lg transition-all duration-300 text-lg uppercase tracking-wider hover:scale-105"
          >
            View All Products
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>
    </div>
  )
}

function ManufacturersSection() {
  // Use metadata endpoint to get brands efficiently
  const { data: metadata, isLoading } = useSWR<{
    brands: string[]
    total: number
  }>('/api/inventory?all=true', fetcher)

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
    if (brandNormalization[lowerBrand]) {
      return brandNormalization[lowerBrand]
    }
    return brand
  }

  // Get unique manufacturers (filtered to only valid brands)
  const manufacturers = useMemo(() => {
    if (!metadata?.brands || !Array.isArray(metadata.brands)) return []

    const normalizedBrands = metadata.brands
      .map((brand) => normalizeBrand(brand))
      .filter((brand): brand is string => {
        if (!brand) return false
        return validBrands.some(
          (validBrand) => validBrand.toLowerCase() === brand.toLowerCase()
        )
      })

    const uniqueBrands = new Set(normalizedBrands)
    return Array.from(uniqueBrands).sort((a, b) => {
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
    })
  }, [metadata, normalizeBrand, validBrands])

  if (isLoading) {
    return (
      <section className="py-20 px-6 bg-gray-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl md:text-6xl font-black mb-4 uppercase tracking-tight">
              Shop by Brand
            </h2>
            <p className="text-xl text-gray-400">
              Browse our selection by manufacturer
            </p>
          </div>
          <div className="flex justify-center py-12">
            <Loader2 className="w-12 h-12 animate-spin text-white" />
          </div>
        </div>
      </section>
    )
  }

  if (manufacturers.length === 0) {
    return null
  }

  return (
    <section className="py-20 px-6 bg-gray-950">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-6xl font-black mb-4 uppercase tracking-tight">
            Shop by Brand
          </h2>
          <p className="text-xl text-gray-400 mb-8">
            Browse our selection by manufacturer
          </p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {manufacturers.map((brand) => (
            <Link
              key={brand}
              href={`/shop/brand/${encodeURIComponent(brand)}`}
              className="bg-gray-900 rounded-lg p-6 border border-gray-800 hover:border-gray-600 transition-all duration-300 group hover:shadow-2xl hover:shadow-white/10 text-center"
            >
              <h3 className="text-xl font-bold text-white group-hover:text-gray-200 transition-colors uppercase tracking-tight">
                {brand}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
