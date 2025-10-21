import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || ''
  const { pathname } = request.nextUrl
  
  // Debug logging
  console.log('🔍 Middleware invoked:', { hostname, pathname })
  
  // Detect if we're on the bannership subdomain
  const isBannershipSubdomain = hostname.startsWith('bannership.') || 
                                 hostname === 'bannership.stickershuttle.com'
  
  console.log('🔍 Is Bannership subdomain?', isBannershipSubdomain)
  
  // Skip middleware for static files, API routes, and Next.js internals
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.includes('.')
  ) {
    console.log('⏭️ Skipping middleware for:', pathname)
    return NextResponse.next()
  }
  
  // Handle bannership subdomain
  if (isBannershipSubdomain) {
    const url = request.nextUrl.clone()
    
    // If not already on /bannership path
    if (!pathname.startsWith('/bannership')) {
      // Rewrite to add /bannership prefix
      if (pathname === '/') {
        url.pathname = '/bannership'
      } else {
        url.pathname = `/bannership${pathname}`
      }
      
      console.log(`🔄 Rewriting ${pathname} to ${url.pathname}`)
      return NextResponse.rewrite(url)
    } else {
      console.log('✅ Already on /bannership path, no rewrite needed')
    }
  } else {
    console.log('📍 Not bannership subdomain, serving normally')
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
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
}

