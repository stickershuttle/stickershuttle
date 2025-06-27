import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';

const Maintenance: NextPage = () => {
  return (
    <>
      <Head>
        <title>Maintenance - Sticker Shuttle</title>
        <meta name="description" content="Sticker Shuttle is currently undergoing scheduled maintenance. We'll be back online shortly." />
        <meta name="robots" content="noindex, nofollow" />
      </Head>

      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#030140' }}>
        <div className="container mx-auto px-4">
          <div 
            className="max-w-2xl mx-auto p-8 rounded-2xl text-center"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
              backdropFilter: 'blur(12px)'
            }}
          >
            {/* Logo */}
            <div className="mb-8">
              <img 
                src="https://res.cloudinary.com/dxcnvqk6b/image/upload/v1749591683/White_Logo_ojmn3s.png" 
                alt="Sticker Shuttle Logo" 
                className="h-16 mx-auto mb-6"
              />
            </div>

            <div className="mb-8">
              <h1 className="text-4xl font-bold text-white mb-4">We'll Be Right Back!</h1>
              <h2 className="text-2xl font-semibold text-gray-300 mb-6">Scheduled Maintenance</h2>
              <p className="text-gray-300 text-lg mb-6">
                We're currently performing scheduled maintenance to improve our services. 
                Our team is working hard to get everything back online as quickly as possible.
              </p>
              <p className="text-gray-400 mb-8">
                Expected downtime: 30-60 minutes
              </p>
            </div>

            <div className="space-y-6">
              <div 
                className="p-6 rounded-lg"
                style={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.1)'
                }}
              >
                <h3 className="text-white font-semibold mb-3">What's Being Updated?</h3>
                <ul className="text-gray-300 space-y-2 text-left">
                  <li>• Performance improvements</li>
                  <li>• Security updates</li>
                  <li>• New features and bug fixes</li>
                  <li>• Database optimization</li>
                </ul>
              </div>

              <div className="pt-4">
                <h3 className="text-white font-semibold mb-4">Need Immediate Help?</h3>
                <p className="text-gray-300 mb-4">
                  For urgent matters, you can still reach us:
                </p>
                <div className="space-y-3">
                  <a 
                    href="mailto:support@stickershuttle.com"
                    className="inline-block px-6 py-3 rounded-lg font-semibold text-white transition-all duration-300 hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                      backdropFilter: 'blur(25px) saturate(180%)',
                      border: '1px solid rgba(59, 130, 246, 0.4)',
                      boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                    }}
                  >
                    📧 Email Support
                  </a>
                </div>
              </div>

              <div className="pt-6 border-t border-gray-600">
                <p className="text-gray-400 text-sm mb-4">
                  Want to stay updated?
                </p>
                <p className="text-gray-300 text-sm">
                  Follow us on social media or check back here for updates on our maintenance progress.
                </p>
              </div>

              <div className="pt-4">
                <button 
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 rounded-lg font-semibold text-white transition-all duration-300 hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, rgba(255, 215, 19, 0.6) 0%, rgba(255, 215, 19, 0.4) 50%, rgba(255, 215, 19, 0.7) 100%)',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    border: '1px solid rgba(255, 215, 19, 0.4)',
                    boxShadow: 'rgba(255, 215, 19, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                  }}
                >
                  🔄 Refresh Page
                </button>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-gray-600">
              <p className="text-gray-500 text-sm">
                Thank you for your patience!<br />
                - The Sticker Shuttle Team
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default Maintenance; 