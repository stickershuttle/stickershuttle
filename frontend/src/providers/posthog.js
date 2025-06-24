'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/router'
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react'
import posthog from 'posthog-js'

if (typeof window !== 'undefined' && process.env.NEXT_PUBLIC_POSTHOG_KEY) {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    // Enable debug mode in development
    loaded: (posthog) => {
      if (process.env.NODE_ENV === 'development') console.log('PostHog loaded')
    }
  })
}

function PostHogPageView() {
  const router = useRouter()
  const posthogInstance = usePostHog()

  useEffect(() => {
    // Track page views
    const handleRouteChange = () => {
      if (posthogInstance) {
        posthogInstance.capture('$pageview')
      }
    }

    router.events.on('routeChangeComplete', handleRouteChange)

    return () => {
      router.events.off('routeChangeComplete', handleRouteChange)
    }
  }, [router.events, posthogInstance])

  return null
}

export function PostHogProvider({ children }) {
  return (
    <PHProvider client={posthog}>
      <PostHogPageView />
      {children}
    </PHProvider>
  )
} 