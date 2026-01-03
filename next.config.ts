import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Transpile packages that need it
  transpilePackages: [],
  
  // Image optimization settings
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
}

export default nextConfig
