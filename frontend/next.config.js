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
}

module.exports = nextConfig
