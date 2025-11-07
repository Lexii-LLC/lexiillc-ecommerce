import {
  HeadContent,
  Scripts,
  createRootRouteWithContext,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import Header from '../components/Header'

import ClerkProvider from '../integrations/clerk/provider'

import TanStackQueryDevtools from '../integrations/tanstack-query/devtools'

import StoreDevtools from '../lib/demo-store-devtools'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

interface MyRouterContext {
  queryClient: QueryClient
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => {
    const logoUrl = 'https://portal.lexiillc.com/assets/logo-dbf3009d.jpg';
    const siteTitle = 'Lexii LLC - Shoes at Vintage Faire Mall, Modesto';
    const siteDescription = 'Shop shoes online and pick up in-store at Lexii LLC in Vintage Faire Mall, Modesto. Get early access to our online store.';
    
    return {
      meta: [
        {
          charSet: 'utf-8',
        },
        {
          name: 'viewport',
          content: 'width=device-width, initial-scale=1',
        },
        {
          title: siteTitle,
        },
        {
          name: 'description',
          content: siteDescription,
        },
        // Open Graph / Facebook
        {
          property: 'og:type',
          content: 'website',
        },
        {
          property: 'og:title',
          content: siteTitle,
        },
        {
          property: 'og:description',
          content: siteDescription,
        },
        {
          property: 'og:image',
          content: logoUrl,
        },
        {
          property: 'og:url',
          content: 'https://lexiillc.com',
        },
        {
          property: 'og:site_name',
          content: 'Lexii LLC',
        },
        // Twitter
        {
          name: 'twitter:card',
          content: 'summary_large_image',
        },
        {
          name: 'twitter:title',
          content: siteTitle,
        },
        {
          name: 'twitter:description',
          content: siteDescription,
        },
        {
          name: 'twitter:image',
          content: logoUrl,
        },
        // Additional SEO
        {
          name: 'theme-color',
          content: '#000000',
        },
      ],
      links: [
        {
          rel: 'stylesheet',
          href: appCss,
        },
        {
          rel: 'icon',
          href: logoUrl,
          type: 'image/jpeg',
        },
        {
          rel: 'apple-touch-icon',
          href: logoUrl,
        },
      ],
    };
  },

  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        <ClerkProvider>
          {/* View Mode Banner */}
          <div className="bg-yellow-500 text-black text-center py-3 px-4 border-b-2 border-yellow-600">
            <p className="text-sm md:text-base font-bold uppercase tracking-wide">
              ⚠️ View Mode: Products are for viewing only. Online purchases are not available yet.
            </p>
          </div>
          <Header />
          {children}
          {!import.meta.env.PROD && (
            <TanStackDevtools
              config={{
                position: 'bottom-right',
              }}
              plugins={[
                {
                  name: 'Tanstack Router',
                  render: <TanStackRouterDevtoolsPanel />,
                },
                TanStackQueryDevtools,
                StoreDevtools,
              ]}
            />
          )}
        </ClerkProvider>
        <Scripts />
      </body>
    </html>
  )
}
