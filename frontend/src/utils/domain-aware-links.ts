/**
 * Helper utilities for domain-aware navigation
 * Handles links between stickershuttle.com and bannership.stickershuttle.com
 */

/**
 * Get a domain-aware URL for internal navigation
 * If user is on bannership.stickershuttle.com, keep them there
 * If user is on stickershuttle.com, keep them there
 */
export function getDomainAwareUrl(path: string): string {
  if (typeof window === 'undefined') return path
  
  const hostname = window.location.hostname
  const isBannershipSubdomain = hostname.startsWith('bannership.')
  
  // If on bannership subdomain and path starts with /bannership
  if (isBannershipSubdomain && path.startsWith('/bannership')) {
    // Remove /bannership prefix since middleware adds it automatically
    return path.replace('/bannership', '') || '/'
  }
  
  return path
}

/**
 * Check if we're currently on the bannership subdomain
 */
export function isBannershipDomain(): boolean {
  if (typeof window === 'undefined') return false
  return window.location.hostname.startsWith('bannership.')
}

/**
 * Get the full URL for a path (handles cross-domain links)
 * Use this when you need to link between main site and bannership
 * 
 * @param path - The path to link to (e.g., '/cart', '/bannership/products/pop-up-banners')
 * @param forceDomain - Force the link to use a specific domain
 * @returns Full URL or relative path depending on context
 */
export function getFullUrl(path: string, forceDomain?: 'main' | 'bannership'): string {
  if (typeof window === 'undefined') return path
  
  const protocol = window.location.protocol
  const isLocalhost = window.location.hostname.includes('localhost')
  
  // For localhost, just return the path
  if (isLocalhost) return path
  
  const mainDomain = 'stickershuttle.com'
  const bannershipDomain = 'bannership.stickershuttle.com'
  
  if (forceDomain === 'bannership') {
    const cleanPath = path.startsWith('/bannership') ? path.replace('/bannership', '') : path
    return `${protocol}//${bannershipDomain}${cleanPath}`
  }
  
  if (forceDomain === 'main') {
    return `${protocol}//${mainDomain}${path}`
  }
  
  // Default behavior - stay on current domain
  return path
}

/**
 * Get the appropriate cart URL based on current domain
 * Cart should always be on main stickershuttle.com domain
 */
export function getCartUrl(): string {
  if (typeof window === 'undefined') return '/cart'
  
  const hostname = window.location.hostname
  const isLocalhost = hostname.includes('localhost')
  const isBannershipSubdomain = hostname.startsWith('bannership.')
  
  // For localhost, redirect bannership subdomain to main localhost
  if (isLocalhost && isBannershipSubdomain) {
    return `${window.location.protocol}//localhost:${window.location.port}/cart`
  }
  
  // For localhost on main domain, just use relative path
  if (isLocalhost) return '/cart'
  
  // For production, use full URL to main domain
  return getFullUrl('/cart', 'main')
}

/**
 * Get the appropriate checkout URL
 * Checkout should always be on main stickershuttle.com domain
 */
export function getCheckoutUrl(): string {
  return getCartUrl() // Same as cart for now
}

/**
 * Get the base domain for setting cookies
 */
export function getBaseDomain(): string {
  if (typeof window === 'undefined') return '.stickershuttle.com'
  
  const hostname = window.location.hostname
  
  // For localhost development - use .localhost to share cookies across subdomains
  if (hostname.includes('localhost')) return '.localhost'
  
  // For production - use .stickershuttle.com to share cookies across subdomains
  return '.stickershuttle.com'
}

