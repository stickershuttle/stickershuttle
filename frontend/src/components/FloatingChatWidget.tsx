"use client"

import { useState, useEffect } from "react"
import { getSupabase } from "../lib/supabase"

interface FloatingChatWidgetProps {
  showOnProductPages?: boolean
}

export default function FloatingChatWidget({ showOnProductPages = true }: FloatingChatWidgetProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isAnimating, setIsAnimating] = useState(false)
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkUser()
  }, [])

  const checkUser = async () => {
    try {
      if (typeof window !== 'undefined') {
        const supabase = getSupabase()
        const { data: { session } } = await supabase.auth.getSession()
        setUser(session?.user || null)
      }
    } catch (error) {
      console.error('Error checking user:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // Only show the widget if user is NOT signed in and after loading is complete
    if (!loading && !user) {
      const timer = setTimeout(() => {
        setIsVisible(true)
        // Start the bubble animation
        setTimeout(() => {
          setIsAnimating(true)
        }, 500)
      }, 2000) // 2 second delay before showing

      return () => clearTimeout(timer)
    }
  }, [loading, user])

  const handleClose = () => {
    setIsVisible(false)
  }

  // Don't show if user is signed in or still loading
  if (loading || user || !isVisible) return null

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-end gap-3">
      {/* Chat Bubble - Liquid Glass Style */}
      <div 
        className={`relative rounded-2xl px-4 py-4 max-w-xs transition-all duration-500 backdrop-blur-md ${
          isAnimating ? 'animate-bounce' : ''
        }`}
        style={{
          background: 'rgba(255, 255, 255, 0.15)',
          border: '1px solid rgba(255, 255, 255, 0.2)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)',
          animation: isAnimating ? 'gentle-bounce 2s ease-in-out infinite' : undefined
        }}
      >
        {/* Speech bubble tail - Proper triangle that stops at bubble */}
        <div 
          className="absolute bottom-4 -right-3"
          style={{
            width: 0,
            height: 0,
            borderTop: '8px solid transparent',
            borderBottom: '8px solid transparent',
            borderLeft: '12px solid rgba(255, 255, 255, 0.15)',
            filter: 'drop-shadow(1px 0 0 rgba(255, 255, 255, 0.2))'
          }}
        ></div>
        
        {/* Close button - Moved to prevent overlap */}
        <button
          onClick={handleClose}
          className="absolute -top-2 -right-2 w-6 h-6 rounded-full flex items-center justify-center text-white/80 hover:text-white transition-colors text-xs backdrop-blur-sm z-20"
          style={{
            background: 'rgba(255, 255, 255, 0.2)',
            border: '1px solid rgba(255, 255, 255, 0.3)'
          }}
        >
          ✕
        </button>
        
        {/* Message content */}
        <div className="relative z-10 pr-4">
          <p className="text-sm text-white font-medium leading-relaxed drop-shadow-sm mb-2">
            It's recommended you sign in for the best experience and deals!
          </p>

          
          {/* Login/Signup Buttons */}
          <div className="flex gap-2 mt-3">
            <a
              href="/login"
              className="flex-1 px-3 py-2 text-xs font-medium text-center rounded-lg transition-all duration-200 transform hover:scale-105"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)',
                color: 'white'
              }}
            >
              Login
            </a>
            <a
              href="/signup"
              className="primaryButton flex-1 px-3 py-2 text-xs font-medium text-center rounded-lg transition-all duration-200 transform hover:scale-105"
            >
              Signup
            </a>
          </div>
        </div>
      </div>

      {/* Alien Character - Flipped Horizontally */}
      <div className="flex-shrink-0">
        <img
          src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749075558/StickerShuttle_Alien_xfwvvh.svg"
          alt="Sticker Shuttle Alien"
          className="w-16 h-16 transition-transform duration-300 hover:scale-110 scale-x-[-1]"
        />
      </div>

      {/* Custom CSS for gentle bounce animation */}
      <style jsx>{`
        @keyframes gentle-bounce {
          0%, 20%, 50%, 80%, 100% {
            transform: translateY(0);
          }
          40% {
            transform: translateY(-8px);
          }
          60% {
            transform: translateY(-4px);
          }
        }
      `}</style>
    </div>
  )
} 