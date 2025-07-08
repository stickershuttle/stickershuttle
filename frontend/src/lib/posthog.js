import { PostHog } from 'posthog-js'

export default function PostHogClient() {
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY
  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

  // Only initialize on the client side
  if (typeof window !== 'undefined' && posthogKey) {
    const posthog = new PostHog(posthogKey, {
      api_host: posthogHost,
      person_profiles: 'identified_only', // or 'always' to create profiles for anonymous users as well
      loaded: (posthog) => {
        // PostHog loaded
      }
    })
    return posthog
  }
  return null
}

// Export the instance
export const posthog = PostHogClient() 