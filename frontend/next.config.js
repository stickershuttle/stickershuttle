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
      return config
    }
  }),
  
  // Add image domains configuration
  images: {
    domains: ['res.cloudinary.com'],
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
