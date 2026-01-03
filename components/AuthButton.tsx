'use client'

import { useAuth } from '@/hooks/useAuth'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { User, LogOut, Loader2 } from 'lucide-react'

export default function AuthButton() {
  const { user, isLoading, signOut } = useAuth()
  const router = useRouter()

  const handleSignOut = async () => {
    await signOut()
    router.refresh()
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-4 py-2">
        <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
      </div>
    )
  }

  if (user) {
    return (
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 text-gray-300">
          <User className="w-5 h-5" />
          <span className="text-sm hidden md:inline">
            {user.email?.split('@')[0]}
          </span>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors text-gray-300 hover:text-white"
        >
          <LogOut className="w-5 h-5" />
          <span className="hidden md:inline">Sign Out</span>
        </button>
      </div>
    )
  }

  return (
    <Link
      href="/auth/login"
      className="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-gray-900 transition-colors"
    >
      <User className="w-5 h-5" />
      <span className="font-medium">Sign In</span>
    </Link>
  )
}
