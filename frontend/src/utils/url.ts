/**
 * URL utility functions to ensure consistent domain usage
 * Always uses stickershuttle.com as the canonical domain
 */

export const CANONICAL_DOMAIN = 'stickershuttle.com';
export const CANONICAL_URL = `https://${CANONICAL_DOMAIN}`;

/**
 * Get the canonical origin URL for the application
 * Always returns https://stickershuttle.com regardless of current domain
 */
export const getCanonicalOrigin = (): string => {
  return CANONICAL_URL;
};

/**
 * Generate a canonical URL for a given path
 * @param path - The path to append to the canonical domain
 * @returns Full canonical URL
 */
export const getCanonicalUrl = (path: string): string => {
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${CANONICAL_URL}${normalizedPath}`;
};

/**
 * Check if the current domain is the canonical domain
 * @returns true if on stickershuttle.com, false otherwise
 */
export const isCanonicalDomain = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.location.hostname === CANONICAL_DOMAIN;
};

/**
 * Get the current origin, but prefer canonical domain for URL generation
 * Use this instead of window.location.origin for user-facing URLs
 */
export const getOriginForUrls = (): string => {
  return CANONICAL_URL;
}; 