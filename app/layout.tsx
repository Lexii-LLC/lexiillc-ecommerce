import type { Metadata } from 'next'
import { Providers } from './providers'
import Header from '@/components/Header'
import './globals.css'

const logoUrl = 'https://portal.lexiillc.com/assets/logo-dbf3009d.jpg'

export const metadata: Metadata = {
  title: 'Lexii LLC - Shoes at Vintage Faire Mall, Modesto',
  description:
    'Shop shoes online and pick up in-store at Lexii LLC in Vintage Faire Mall, Modesto. Get early access to our online store.',
  openGraph: {
    type: 'website',
    title: 'Lexii LLC - Shoes at Vintage Faire Mall, Modesto',
    description:
      'Shop shoes online and pick up in-store at Lexii LLC in Vintage Faire Mall, Modesto. Get early access to our online store.',
    images: [logoUrl],
    url: 'https://lexiillc.com',
    siteName: 'Lexii LLC',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Lexii LLC - Shoes at Vintage Faire Mall, Modesto',
    description:
      'Shop shoes online and pick up in-store at Lexii LLC in Vintage Faire Mall, Modesto. Get early access to our online store.',
    images: [logoUrl],
  },
  icons: {
    icon: logoUrl,
    apple: logoUrl,
  },
}

export const viewport = {
  themeColor: '#000000',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <Providers>
          {/* View Mode Banner */}
          <div className="bg-yellow-500 text-black text-center py-3 px-4 border-b-2 border-yellow-600">
            <p className="text-sm md:text-base font-bold uppercase tracking-wide">
              ⚠️ View Mode: Products are for viewing only. Online purchases are
              not available yet.
            </p>
          </div>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  )
}
