import { NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';
import Layout from '../components/Layout';

const Returns: NextPage = () => {
  return (
    <Layout>
      <Head>
        <title>Returns & Refunds - Sticker Shuttle</title>
        <meta name="description" content="Sticker Shuttle's return and refund policy for custom stickers and printing services." />
      </Head>

      <div className="min-h-screen" style={{ backgroundColor: '#030140' }}>
        <div className="container mx-auto px-4 py-16">
          <div 
            className="max-w-4xl mx-auto p-8 rounded-2xl"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
              backdropFilter: 'blur(12px)'
            }}
          >
            <h1 className="text-4xl font-bold text-white mb-8">Returns & Refunds</h1>
            <p className="text-gray-300 mb-8">Last updated: January 15, 2024</p>

            <div className="space-y-8 text-gray-200">
              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Our Return Policy</h2>
                <p className="mb-4">
                  At Sticker Shuttle, we want you to be completely satisfied with your custom sticker order. 
                  Since our products are made-to-order and customized specifically for you, we have specific 
                  guidelines for returns and refunds.
                </p>
                <div 
                  className="p-4 rounded-lg mb-4"
                  style={{
                    background: 'rgba(59, 130, 246, 0.1)',
                    border: '1px solid rgba(59, 130, 246, 0.3)'
                  }}
                >
                  <p className="text-blue-200 font-medium">
                    💡 <strong>Important:</strong> Custom products are generally non-returnable unless there's a defect or error on our part.
                  </p>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Eligible Returns & Refunds</h2>
                <p className="mb-4">We will provide a full refund or reprint for orders that meet any of these conditions:</p>
                
                <div className="space-y-4">
                  <div 
                    className="p-6 rounded-lg"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <h3 className="text-xl font-medium text-white mb-3">🔧 Production Defects</h3>
                    <ul className="list-disc list-inside ml-4 space-y-2">
                      <li>Printing errors (wrong colors, blurry images, poor quality)</li>
                      <li>Material defects (adhesive failure, material tears)</li>
                      <li>Incorrect sizing or cutting</li>
                      <li>Missing items from your order</li>
                    </ul>
                  </div>

                  <div 
                    className="p-6 rounded-lg"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <h3 className="text-xl font-medium text-white mb-3">📦 Shipping Issues</h3>
                    <ul className="list-disc list-inside ml-4 space-y-2">
                      <li>Package damaged during shipping</li>
                      <li>Items damaged due to poor packaging</li>
                      <li>Wrong items shipped</li>
                      <li>Package lost in transit (after investigation)</li>
                    </ul>
                  </div>

                  <div 
                    className="p-6 rounded-lg"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <h3 className="text-xl font-medium text-white mb-3">❌ Our Errors</h3>
                    <ul className="list-disc list-inside ml-4 space-y-2">
                      <li>We printed the wrong design</li>
                      <li>We made an error in your approved proof</li>
                      <li>Incorrect product specifications</li>
                      <li>Failure to follow your approved instructions</li>
                    </ul>
                  </div>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">How to Request a Return</h2>
                <div className="space-y-4">
                  <h3 className="text-xl font-medium text-white">Step 1: Contact Us Within 30 Days</h3>
                  <p className="mb-4">
                    All return requests must be made within 30 days of your delivery date. 
                    Contact us as soon as possible if you notice any issues.
                  </p>

                  <h3 className="text-xl font-medium text-white">Step 2: Provide Required Information</h3>
                  <p className="mb-2">When contacting us, please include:</p>
                  <ul className="list-disc list-inside ml-4 space-y-2">
                    <li>Your order number</li>
                    <li>Clear photos of the issue</li>
                    <li>Description of the problem</li>
                    <li>Your contact information</li>
                  </ul>
                </div>
              </section>

              <section>
                <h2 className="text-2xl font-semibold text-white mb-4">Contact Information</h2>
                <p className="mb-4">To request a return or refund, contact us using any of these methods:</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div 
                    className="p-4 rounded-lg"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <h3 className="text-white font-semibold mb-2">📧 Email</h3>
                    <p className="text-gray-300">returns@stickershuttle.com</p>
                    <p className="text-sm text-gray-400">Response within 24 hours</p>
                  </div>

                  <div 
                    className="p-4 rounded-lg"
                    style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)'
                    }}
                  >
                    <h3 className="text-white font-semibold mb-2">💬 Support</h3>
                    <p className="text-gray-300">support@stickershuttle.com</p>
                    <p className="text-sm text-gray-400">General inquiries</p>
                  </div>
                </div>

                <div className="mt-6 text-center">
                  <Link href="/contact-us">
                    <button 
                      className="px-6 py-3 rounded-lg font-semibold text-white transition-all duration-300 hover:scale-105"
                      style={{
                        background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                        backdropFilter: 'blur(25px) saturate(180%)',
                        border: '1px solid rgba(59, 130, 246, 0.4)',
                        boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                      }}
                    >
                      Contact Support
                    </button>
                  </Link>
                </div>
              </section>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Returns; 