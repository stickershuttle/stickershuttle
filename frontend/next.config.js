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
  
  // Add image remote patterns configuration (updated from deprecated domains)
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
        port: '',
        pathname: '/**',
      },
    ],
  },

  // Allow ESLint errors during build (treat as warnings)
  eslint: {
    ignoreDuringBuilds: true,
  },

  // Allow TypeScript errors during build (for demonstration files)
  typescript: {
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig
