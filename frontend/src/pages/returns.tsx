import React from 'react';
import Layout from '../components/Layout';
import SEOHead from '../components/SEOHead';
import Link from 'next/link';

export default function Returns() {
  return (
    <Layout>
      <SEOHead 
        title="Returns & Refunds - Sticker Shuttle"
        description="Learn about our hassle-free returns and refunds policy for custom stickers and vinyl banners."
        canonical="/returns"
        ogType="website"
      />

      <div className="min-h-screen py-12" style={{ backgroundColor: '#030140' }}>
        <div className="w-[95%] md:w-[90%] xl:w-[90%] 2xl:w-[75%] mx-auto px-4">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Returns & Refunds
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              We stand behind our quality. If you're not completely satisfied with your order, we're here to help.
            </p>
          </div>

          {/* Main Content */}
          <div className="grid gap-8 lg:gap-12">
            {/* Our Promise */}
            <div 
              className="p-8 rounded-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            >
              <h2 className="text-2xl font-bold text-white mb-4 flex items-center">
                <span className="mr-3">🛡️</span>
                Our Quality Promise
              </h2>
              <p className="text-gray-300 text-lg leading-relaxed">
                At Sticker Shuttle, we're committed to delivering the highest quality custom stickers and vinyl banners. 
                If your order doesn't meet our high standards or your expectations, we'll make it right.
              </p>
            </div>

            {/* Return Policy */}
            <div 
              className="p-8 rounded-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            >
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <span className="mr-3">📋</span>
                Return Policy
              </h2>
              
              <div className="space-y-6">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">Eligible Returns</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li className="flex items-start">
                      <span className="text-green-400 mr-2 mt-1">✓</span>
                      Defective or damaged products due to printing errors
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-400 mr-2 mt-1">✓</span>
                      Orders that don't match your approved proof
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-400 mr-2 mt-1">✓</span>
                      Quality issues with materials or adhesive
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-400 mr-2 mt-1">✓</span>
                      Incorrect quantities or specifications
                    </li>
                  </ul>
                </div>

                <div>
                  <h3 className="text-xl font-semibold text-white mb-3">Non-Returnable Items</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li className="flex items-start">
                      <span className="text-red-400 mr-2 mt-1">✗</span>
                      Custom orders that match your approved proof and specifications
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-400 mr-2 mt-1">✗</span>
                      Orders with customer-provided design errors
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-400 mr-2 mt-1">✗</span>
                      Stickers that have been applied or partially used
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Return Process */}
            <div 
              className="p-8 rounded-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            >
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <span className="mr-3">🔄</span>
                How to Return Your Order
              </h2>
              
              <div className="grid gap-6 md:grid-cols-3">
                <div className="text-center">
                  <div className="text-3xl mb-3">1️⃣</div>
                  <h3 className="text-lg font-semibold text-white mb-2">Contact Us</h3>
                  <p className="text-gray-300 text-sm">
                    Reach out within 30 days of delivery with your order number and photos of the issue.
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl mb-3">2️⃣</div>
                  <h3 className="text-lg font-semibold text-white mb-2">Get Approval</h3>
                  <p className="text-gray-300 text-sm">
                    We'll review your request and provide a return authorization if eligible.
                  </p>
                </div>
                
                <div className="text-center">
                  <div className="text-3xl mb-3">3️⃣</div>
                  <h3 className="text-lg font-semibold text-white mb-2">Ship & Refund</h3>
                  <p className="text-gray-300 text-sm">
                    Send items back with our prepaid label and receive your refund within 5-7 business days.
                  </p>
                </div>
              </div>
            </div>

            {/* Refund Information */}
            <div 
              className="p-8 rounded-xl"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            >
              <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <span className="mr-3">💰</span>
                Refund Information
              </h2>
              
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">Refund Timeline</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li>• Processing: 1-2 business days after we receive your return</li>
                    <li>• Credit card refunds: 5-7 business days</li>
                    <li>• PayPal refunds: 2-3 business days</li>
                    <li>• Store credit: Immediate</li>
                  </ul>
                </div>
                
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">What Gets Refunded</h3>
                  <ul className="text-gray-300 space-y-2">
                    <li>• Full product price</li>
                    <li>• Original shipping costs (if our error)</li>
                    <li>• Rush fees (if applicable)</li>
                    <li>• Store credits and discounts used</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Contact Section */}
            <div 
              className="p-8 rounded-xl text-center"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                backdropFilter: 'blur(12px)'
              }}
            >
              <h2 className="text-2xl font-bold text-white mb-4">Need Help?</h2>
              <p className="text-gray-300 mb-6">
                Have questions about returns or need to start a return? We're here to help!
              </p>
              
              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Link 
                  href="/contact-us"
                  className="px-6 py-3 rounded-lg text-white font-semibold transition-all duration-200 hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                  }}
                >
                  Contact Support
                </Link>
                
                <Link 
                  href="/account/dashboard"
                  className="px-6 py-3 rounded-lg text-white font-semibold transition-all duration-200 hover:scale-105"
                  style={{
                    background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                    backdropFilter: 'blur(25px) saturate(180%)',
                    border: '1px solid rgba(59, 130, 246, 0.4)',
                    boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                  }}
                >
                  View My Orders
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
} 