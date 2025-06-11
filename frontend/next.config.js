/** @type {import('next').NextConfig} */
const nextConfig = {
  // Enable hot reloading in Docker
  webpackDevMiddleware: config => {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
    }
    return config
  },
}

module.exports = nextConfig
