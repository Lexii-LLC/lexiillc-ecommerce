'use client'

import { SWRConfig } from 'swr'
import { AuthProvider } from '@/hooks/useAuth'
import { QueryProvider } from '@/lib/query-provider'

interface ProvidersProps {
  children: React.ReactNode
}

export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <SWRConfig
        value={{
          revalidateOnFocus: false,
          revalidateOnReconnect: true,
          dedupingInterval: 10000,
          fetcher: (url: string) => fetch(url).then((res) => res.json()),
        }}
      >
        <AuthProvider>{children}</AuthProvider>
      </SWRConfig>
    </QueryProvider>
  )
}
