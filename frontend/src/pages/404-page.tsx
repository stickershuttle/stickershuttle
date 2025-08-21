import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/Layout';

const Custom404Page: NextPage = () => {
  return (
    <Layout>
      <Head>
        <title>Page Not Found - Sticker Shuttle</title>
        <meta name="description" content="The page you're looking for doesn't exist. Find what you need on Sticker Shuttle." />
      </Head>

      <div className="min-h-screen" style={{ backgroundColor: '#030140' }}>
        <div className="container mx-auto px-4 py-16">
          <div 
            className="max-w-2xl mx-auto p-8 rounded-2xl text-center"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
              backdropFilter: 'blur(12px)'
            }}
          >
            <div className="mb-8">
              <h1 className="text-6xl font-bold text-white mb-4">404</h1>
              <h2 className="text-3xl font-semibold text-white mb-4">Page Not Found</h2>
              <p className="text-gray-300 text-lg mb-8">
                Oops! The page you're looking for seems to have vanished like a peeled sticker. 
                Don't worry, we'll help you find what you need!
              </p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Link href="/" className="block">
                  <div 
                    className="p-4 rounded-lg transition-all duration-300 hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                      backdropFilter: 'blur(25px) saturate(180%)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                    }}
                  >
                    <h3 className="text-white font-semibold mb-2">🏠 Go Home</h3>
                    <p className="text-gray-200 text-sm">Return to our homepage</p>
                  </div>
                </Link>

                <Link href="/products" className="block">
                  <div 
                    className="p-4 rounded-lg transition-all duration-300 hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                      backdropFilter: 'blur(25px) saturate(180%)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                    }}
                  >
                    <h3 className="text-white font-semibold mb-2">🏷️ Browse Products</h3>
                    <p className="text-gray-200 text-sm">Check out our sticker collection</p>
                  </div>
                </Link>
              </div>

              <div className="pt-4">
                <h3 className="text-white font-semibold mb-4">Popular Pages</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  <Link href="/products/vinyl-stickers" className="text-blue-300 hover:text-blue-200 transition-colors">
                    Vinyl Stickers
                  </Link>
                  <Link href="/products/chrome-stickers" className="text-blue-300 hover:text-blue-200 transition-colors">
                    Chrome Stickers
                  </Link>
                  <Link href="/products/holographic-stickers" className="text-blue-300 hover:text-blue-200 transition-colors">
                    Holographic
                  </Link>
                  <Link href="/products/vinyl-banners" className="text-blue-300 hover:text-blue-200 transition-colors">
                    Vinyl Banners
                  </Link>
                  <Link href="/cart" className="text-blue-300 hover:text-blue-200 transition-colors">
                    Shopping Cart
                  </Link>
                  <Link href="/contact" className="text-blue-300 hover:text-blue-200 transition-colors">
                    Contact Us
                  </Link>
                  <Link href="/shipping-process" className="text-blue-300 hover:text-blue-200 transition-colors">
                    Shipping Info
                  </Link>
                  {/* Hide deals entry point for wholesale users via header/footer conditionals; removing direct link here */}
                </div>
              </div>

              <div className="pt-6 border-t border-gray-600">
                <p className="text-gray-400 text-sm mb-4">
                  Still can't find what you're looking for?
                </p>
                <Link href="/contact">
                  <button 
                    className="px-6 py-3 rounded-lg font-semibold text-white transition-all duration-300 hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 215, 19, 0.6) 0%, rgba(255, 215, 19, 0.4) 50%, rgba(255, 215, 19, 0.7) 100%)',
                      backdropFilter: 'blur(25px) saturate(180%)',
                      border: '1px solid rgba(255, 215, 19, 0.4)',
                      boxShadow: 'rgba(255, 215, 19, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                    }}
                  >
                    Contact Support
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Custom404Page; 