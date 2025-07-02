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
              "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com",
              `connect-src 'self' https: wss: https://api.stripe.com https://app.posthog.com https://api.resend.com https://stickershuttle-production.up.railway.app https://*.railway.app https://*.supabase.co https://api.cloudinary.com https://res.cloudinary.com https://api.easypost.com${isDev ? ' http://localhost:4000 ws://localhost:4000 ws://localhost:3000' : ''}`,
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
