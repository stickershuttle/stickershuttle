/** @type {import('next').NextConfig} */
const nextConfig = {
  // For development with hot reloading (only in development)
  ...(process.env.NODE_ENV === 'development' && {
    webpack: (config, { dev }) => {
      if (dev) {
        config.watchOptions = {
          poll: 1000,
          aggregateTimeout: 300,
        }
      }
      
      // Ignore date-fns locale imports to prevent './en' module errors
      config.resolve.alias = {
        ...config.resolve.alias,
        // Ignore date-fns locale imports
        'date-fns/locale': false,
      };
      
      // Add fallback for date-fns locale modules
      config.resolve.fallback = {
        ...config.resolve.fallback,
        'date-fns/locale': false,
      };
      
      return config
    }
  }),
  
  // Add webpack configuration for production builds too
  webpack: (config, { dev, isServer }) => {
    if (dev) {
      config.watchOptions = {
        poll: 1000,
        aggregateTimeout: 300,
      }
    }
    
    // Ignore date-fns locale imports to prevent './en' module errors
    config.resolve.alias = {
      ...config.resolve.alias,
      'date-fns/locale': false,
    };
    
    // Add fallback for date-fns locale modules
    config.resolve.fallback = {
      ...config.resolve.fallback,
      'date-fns/locale': false,
    };

    // Remove console logs in production builds
    if (!dev && !isServer) {
      const TerserPlugin = require('terser-webpack-plugin');
      
      // Find existing TerserPlugin and update it, or add a new one
      const existingTerserPlugin = config.optimization.minimizer.find(
        plugin => plugin.constructor.name === 'TerserPlugin'
      );
      
      if (existingTerserPlugin) {
        // Update existing terser options
        existingTerserPlugin.options.terserOptions.compress = {
          ...existingTerserPlugin.options.terserOptions.compress,
          drop_console: true,
          drop_debugger: true,
        };
      } else {
        // Add new TerserPlugin if none exists
        config.optimization.minimizer.push(
          new TerserPlugin({
            terserOptions: {
              compress: {
                drop_console: true,
                drop_debugger: true,
              },
            },
          })
        );
      }
    }
    
    return config
  },
  
  // Security headers and performance optimizations
  async headers() {
    // Determine if we're in development mode
    const isDev = process.env.NODE_ENV === 'development';
    
    return [
      {
        // Apply to all routes
        source: '/(.*)',
        headers: [
          // Force HTTPS (no HTTP fallback) - only in production
          ...(isDev ? [] : [{
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload'
          }]),
          // Content Security Policy
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              `script-src 'self' 'unsafe-inline' 'unsafe-eval' https://js.stripe.com https://www.googletagmanager.com https://www.google-analytics.com https://app.posthog.com https://fonts.googleapis.com${isDev ? ' https://us-assets.i.posthog.com' : ''}`,
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com",
              "img-src 'self' data: blob: https: http:",
              "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com https://*.stripe.com",
              `connect-src 'self' https: wss: https://api.stripe.com https://app.posthog.com https://api.resend.com https://ss-beyond.up.railway.app https://*.railway.app https://*.supabase.co https://api.cloudinary.com https://res.cloudinary.com https://api.easypost.com${isDev ? ' http://localhost:4000 ws://localhost:4000 ws://localhost:3000' : ''}`,
              "media-src 'self' https: data:",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self' https://checkout.stripe.com",
              "frame-ancestors 'none'",
              "frame-src 'self' https://js.stripe.com https://hooks.stripe.com",
              ...(isDev ? ["worker-src 'self' blob:"] : [])
            ].join('; ')
          },
          // Prevent clickjacking
          {
            key: 'X-Frame-Options',
            value: 'SAMEORIGIN'
          },
          // Prevent MIME type sniffing
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          // Enable XSS protection
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block'
          },
          // Referrer policy for privacy
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          },
          // Permissions policy
          {
            key: 'Permissions-Policy',
            value: [
              'camera=()',
              'microphone=()',
              'geolocation=()',
              'payment=(self "https://js.stripe.com")',
              'usb=()',
              'midi=()',
              'accelerometer=()',
              'gyroscope=()',
              'magnetometer=()'
            ].join(', ')
          }
        ],
      },
      {
        // Cache static assets
        source: '/static/(.*)',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable'
          }
        ]
      },
      {
        // Cache images
        source: '/(.*\\.(?:jpg|jpeg|png|webp|avif|svg|ico))',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=31536000'
          }
        ]
      },
      {
        // Serve sitemap.xml with proper content type
        source: '/sitemap.xml',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/xml; charset=utf-8'
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=86400'
          }
        ]
      },
      {
        // Serve robots.txt with proper content type
        source: '/robots.txt',
        headers: [
          {
            key: 'Content-Type',
            value: 'text/plain; charset=utf-8'
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=3600, s-maxage=86400'
          }
        ]
      }
    ]
  },
  
  // Add image remote patterns configuration (updated from deprecated domains)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'fonts.gstatic.com',
        port: '',
        pathname: '/**',
      }
    ],
    // Enable image optimization and next-gen formats
    formats: ['image/webp', 'image/avif'],
    // Enable lazy loading by default
    unoptimized: false,
    // Enable responsive images
    deviceSizes: [640, 768, 1024, 1280, 1600],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384]
  },

  // Allow ESLint errors during build (treat as warnings)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Allow TypeScript errors during build (for demonstration files)
  typescript: {
    ignoreBuildErrors: true,
  },

  // Performance optimizations enabled by default in production

  // Proxy API requests to backend server during development
  async rewrites() {
    if (process.env.NODE_ENV === 'development') {
      return [
        {
          source: '/api/:path*',
          destination: 'http://localhost:4000/api/:path*',
        },
        {
          source: '/webhooks/:path*',
          destination: 'http://localhost:4000/webhooks/:path*',
        },
      ];
    }
    return [];
  },

  // Add redirects for SEO
  async redirects() {
    return [
      // === SHOPIFY MIGRATION REDIRECTS ===
      // These redirect old Shopify URLs to new custom site URLs
      
      // Product Collection Redirects
      {
        source: '/collections/all',
        destination: '/products',
        permanent: true,
      },
      {
        source: '/collections/stickers',
        destination: '/products',
        permanent: true,
      },
      {
        source: '/collections/vinyl-stickers',
        destination: '/products/vinyl-stickers',
        permanent: true,
      },
      {
        source: '/collections/custom-stickers',
        destination: '/products/vinyl-stickers',
        permanent: true,
      },
      {
        source: '/collections/holographic-stickers',
        destination: '/products/holographic-stickers',
        permanent: true,
      },
      {
        source: '/collections/clear-stickers',
        destination: '/products/clear-stickers',
        permanent: true,
      },
      {
        source: '/collections/chrome-stickers',
        destination: '/products/chrome-stickers',
        permanent: true,
      },
      {
        source: '/collections/glitter-stickers',
        destination: '/products/glitter-stickers',
        permanent: true,
      },
      {
        source: '/collections/bumper-stickers',
        destination: '/products/vinyl-stickers',
        permanent: true,
      },
      {
        source: '/collections/vinyl-banners',
        destination: '/products/vinyl-banners',
        permanent: true,
      },
      {
        source: '/collections/sticker-sheets',
        destination: '/products/sticker-sheets',
        permanent: true,
      },
      {
        source: '/collections/sample-packs',
        destination: '/products/sample-packs',
        permanent: true,
      },
      
      // Individual Product Redirects (common Shopify product handle patterns)
      {
        source: '/products/vinyl-sticker',
        destination: '/products/vinyl-stickers',
        permanent: true,
      },
      {
        source: '/products/custom-vinyl-stickers',
        destination: '/products/vinyl-stickers',
        permanent: true,
      },
      {
        source: '/products/holographic-sticker',
        destination: '/products/holographic-stickers',
        permanent: true,
      },
      {
        source: '/products/clear-sticker',
        destination: '/products/clear-stickers',
        permanent: true,
      },
      {
        source: '/products/chrome-sticker',
        destination: '/products/chrome-stickers',
        permanent: true,
      },
      {
        source: '/products/glitter-sticker',
        destination: '/products/glitter-stickers',
        permanent: true,
      },
      {
        source: '/products/bumper-sticker',
        destination: '/products/vinyl-stickers',
        permanent: true,
      },
      {
        source: '/products/vinyl-banner',
        destination: '/products/vinyl-banners',
        permanent: true,
      },
      {
        source: '/products/sticker-sheet',
        destination: '/products/sticker-sheets',
        permanent: true,
      },
      {
        source: '/products/sample-pack',
        destination: '/products/sample-packs',
        permanent: true,
      },
      
      // Cart and Checkout Redirects
      {
        source: '/checkout',
        destination: '/cart',
        permanent: true,
      },
      
      // Account and Authentication Redirects
      {
        source: '/account',
        destination: '/account/dashboard',
        permanent: true,
      },
      {
        source: '/account/login',
        destination: '/login',
        permanent: true,
      },
      {
        source: '/account/register',
        destination: '/signup',
        permanent: true,
      },
      {
        source: '/account/addresses',
        destination: '/account/dashboard',
        permanent: true,
      },
      {
        source: '/account/orders',
        destination: '/account/dashboard?view=all-orders',
        permanent: true,
      },
      
      // Policy and Info Page Redirects
      {
        source: '/pages/privacy-policy',
        destination: '/privacy-policy',
        permanent: true,
      },
      {
        source: '/pages/terms-of-service',
        destination: '/terms-and-conditions',
        permanent: true,
      },
      {
        source: '/pages/shipping-policy',
        destination: '/shipping-process',
        permanent: true,
      },
      {
        source: '/pages/refund-policy',
        destination: '/returns',
        permanent: true,
      },
      {
        source: '/pages/contact',
        destination: '/contact',
        permanent: true,
      },
      {
        source: '/pages/contact-us',
        destination: '/contact',
        permanent: true,
      },
      {
        source: '/pages/about',
        destination: '/',
        permanent: true,
      },
      {
        source: '/pages/about-us',
        destination: '/',
        permanent: true,
      },
      
      // Blog Redirects
      {
        source: '/blogs/news',
        destination: '/blog',
        permanent: true,
      },
      {
        source: '/blogs/news/:slug',
        destination: '/blog/:slug',
        permanent: true,
      },
      {
        source: '/blogs/sticker-news',
        destination: '/blog',
        permanent: true,
      },
      {
        source: '/blogs/sticker-news/:slug',
        destination: '/blog/:slug',
        permanent: true,
      },
      
      // Search Redirects
      {
        source: '/search',
        destination: '/products',
        permanent: true,
      },
      
      // Common Shopify URL patterns
      {
        source: '/discount/:code',
        destination: '/products',
        permanent: true,
      },
      {
        source: '/collections/:collection/products/:product',
        destination: '/products/:product',
        permanent: true,
      },
      
      // === CATCH-ALL REDIRECTS ===
      // Redirect any remaining /collections/* to /products
      {
        source: '/collections/:path*',
        destination: '/products',
        permanent: true,
      },
      // Redirect any remaining /blogs/* to /blog
      {
        source: '/blogs/:path*',
        destination: '/blog',
        permanent: true,
      },
      
      // === SPECIFIC CUSTOM REDIRECTS ===
      // Custom redirects for specific URLs you identified
      {
        source: '/pages/material-cost-calculator',
        destination: '/',
        permanent: true,
      },
      {
        source: '/products/stickers',
        destination: '/products/vinyl-stickers',
        permanent: true,
      },
      {
        source: '/pages/deals',
        destination: '/deals',
        permanent: true,
      },
      {
        source: '/collections/custom-stickers-1',
        destination: '/products/vinyl-stickers',
        permanent: true,
      },
      {
        source: '/products/holographic-sticker-custom',
        destination: '/products/holographic-stickers',
        permanent: true,
      },
      {
        source: '/products/25-free-small-business-sticker-files-eps-ai',
        destination: '/',
        permanent: true,
      },
      {
        source: '/products/sample',
        destination: '/products/sample-packs',
        permanent: true,
      },
      {
        source: '/products/mini-banners',
        destination: '/',
        permanent: true,
      },
      {
        source: '/blogs/all-blogs',
        destination: '/blog',
        permanent: true,
      },
      
      // === EXISTING REDIRECTS ===
      // Redirect old URLs to new ones (example)
      {
        source: '/products/vinyl',
        destination: '/products/vinyl-stickers',
        permanent: true,
      },
      // Ensure trailing slash consistency
      {
        source: '/products/',
        destination: '/products',
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
