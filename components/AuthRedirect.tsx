'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * Component that detects Supabase auth tokens in URL hash
 * and redirects to appropriate pages (e.g., password reset)
 */
export function AuthRedirect() {
  const router = useRouter()

  useEffect(() => {
    // Check URL hash for auth tokens
    const hash = window.location.hash
    
    if (hash && hash.includes('type=recovery')) {
      // Redirect to reset password page with the hash
      router.push(`/auth/reset-password${hash}`)
    }
  }, [router])

  return null
}
