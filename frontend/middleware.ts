import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Get hostname from multiple possible sources
  const hostname = request.headers.get('host') || 
                   request.headers.get('x-forwarded-host') ||
                   request.nextUrl.hostname || ''
  
  const { pathname } = request.nextUrl
  
  // Debug logging
  console.log('🔍 Middleware invoked:', { 
    hostname, 
    pathname,
    allHeaders: Object.fromEntries(request.headers.entries())
  })
  
  // Detect if we're on the bannership subdomain
  const isBannershipSubdomain = hostname.includes('bannership') || 
                                 hostname.startsWith('bannership.') || 
                                 hostname === 'bannership.stickershuttle.com'
  
  console.log('🔍 Is Bannership subdomain?', isBannershipSubdomain, '(hostname:', hostname, ')')
  
  // Skip middleware for static files, API routes, and Next.js internals
  if (
    pathname.startsWith('/api') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.match(/\.(png|jpg|jpeg|svg|ico|css|js)$/)
  ) {
    console.log('⏭️ Skipping middleware for:', pathname)
    return NextResponse.next()
  }
  
  // Handle bannership subdomain
  if (isBannershipSubdomain) {
    console.log('🏴‍☠️ Bannership subdomain detected!')
    
    const url = request.nextUrl.clone()
    
    // If not already on /bannership path
    if (!pathname.startsWith('/bannership')) {
      // Rewrite to add /bannership prefix
      if (pathname === '/') {
        url.pathname = '/bannership'
      } else {
        url.pathname = `/bannership${pathname}`
      }
      
      console.log(`🔄 REWRITING: ${pathname} → ${url.pathname}`)
      
      const response = NextResponse.rewrite(url)
      // Add a custom header to verify middleware ran
      response.headers.set('x-middleware-rewrite', url.pathname)
      response.headers.set('x-original-host', hostname)
      return response
    } else {
      console.log('✅ Already on /bannership path, no rewrite needed')
    }
  } else {
    console.log('📍 Regular domain (not bannership):', hostname)
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}

