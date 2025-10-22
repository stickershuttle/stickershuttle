import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Get the hostname (e.g. bannership.stickershuttle.com, stickershuttle.com)
  const hostname = request.headers.get('host') || ''
  const url = request.nextUrl
  
  console.log('Middleware - hostname:', hostname, 'pathname:', url.pathname)
  
  // Check if this is the bannership subdomain
  if (hostname === 'bannership.stickershuttle.com' || 
      hostname.startsWith('bannership-stickershuttle-com') || // Vercel preview URLs
      hostname.includes('bannership.')) {
    
    console.log('Bannership subdomain detected!')
    
    // If we're on the bannership subdomain but NOT already on a /bannership path
    if (!url.pathname.startsWith('/bannership')) {
      // Clone the URL
      const newUrl = url.clone()
      
      // Rewrite the path to add /bannership prefix
      if (url.pathname === '/') {
        newUrl.pathname = '/bannership'
      } else if (url.pathname === '/products') {
        newUrl.pathname = '/bannership/products'
      } else if (url.pathname.startsWith('/products/')) {
        newUrl.pathname = `/bannership${url.pathname}`
      } else {
        newUrl.pathname = `/bannership${url.pathname}`
      }
      
      console.log(`Rewriting ${url.pathname} to ${newUrl.pathname}`)
      return NextResponse.rewrite(newUrl)
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files with extensions
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*|_vercel).*)',
  ],
}