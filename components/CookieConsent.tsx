'use client'

import { useState, useEffect } from 'react'
import { X } from 'lucide-react'

const COOKIE_CONSENT_KEY = 'lexii_cookie_consent'

export default function CookieConsent() {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    // Check if user has already accepted cookies
    const consent = localStorage.getItem(COOKIE_CONSENT_KEY)
    if (!consent) {
      // Small delay to avoid flash on page load
      const timer = setTimeout(() => setIsVisible(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleAccept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'accepted')
    setIsVisible(false)
  }

  const handleDismiss = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, 'dismissed')
    setIsVisible(false)
  }

  if (!isVisible) return null

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 md:p-6 animate-slide-up">
      <div className="max-w-4xl mx-auto bg-gray-900 border border-gray-700 rounded-xl shadow-2xl shadow-black/50 p-4 md:p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-4">
          {/* Cookie Icon & Text */}
          <div className="flex-1">
            <h3 className="text-white font-bold text-lg mb-1">🍪 Cookie Notice</h3>
            <p className="text-gray-400 text-sm leading-relaxed">
              We use essential cookies to keep your cart and session working properly. 
              We don&apos;t use tracking or advertising cookies. By continuing to use this site, 
              you agree to our use of these essential cookies.
            </p>
          </div>

          {/* Buttons */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <button
              onClick={handleAccept}
              className="px-6 py-2.5 bg-white text-black font-bold rounded-lg hover:bg-gray-100 transition-colors text-sm uppercase tracking-wider"
            >
              Got it
            </button>
            <button
              onClick={handleDismiss}
              className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-colors"
              aria-label="Dismiss"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
