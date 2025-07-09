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
              
              <div className="space-y-6 text-gray-300">
                <p className="leading-relaxed">
                  We have a 30-day return policy. That means you have 30 days after receiving your item to request a return—but not all orders are eligible. Since everything we make is custom, we handle returns on a case-by-case basis. If there's a delivery issue or printing error on our part, we'll always make it right. If the issue was caused by incorrect info from the customer (like a wrong address), we can't offer a refund.
                </p>
                
                <p className="leading-relaxed">
                  To be eligible for a return, the item must be in the same condition it arrived—unused, with original packaging. You'll also need your order number or proof of purchase.
                </p>
                
                <p className="leading-relaxed">
                  Start a return by contacting <a href="mailto:orbit@stickershuttle.com" className="text-blue-400 hover:text-blue-300">orbit@stickershuttle.com</a>. If approved, we'll send you a return label and instructions. Returns sent without prior approval won't be accepted.
                </p>
                
                <p className="leading-relaxed">
                  For any questions, email <a href="mailto:orbit@stickershuttle.com" className="text-blue-400 hover:text-blue-300">orbit@stickershuttle.com</a>.
                </p>
              </div>
            </div>

            {/* Damages and Issues */}
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
                <span className="mr-3">⚠️</span>
                Damages and Issues
              </h2>
              
              <div className="text-gray-300">
                <p className="leading-relaxed">
                  Please inspect your order as soon as it arrives. If anything is damaged, defective, or incorrect, reach out immediately so we can make it right.
                </p>
              </div>
            </div>

            {/* Exceptions / Non-Returnable Items */}
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
                <span className="mr-3">🚫</span>
                Exceptions / Non-Returnable Items
              </h2>
              
              <div className="space-y-4 text-gray-300">
                <p>We don't accept returns on:</p>
                <ul className="space-y-2 ml-4">
                  <li className="flex items-start">
                    <span className="text-red-400 mr-2 mt-1">•</span>
                    Sale items, gift cards, store credits
                  </li>
                </ul>
                <p>If you're unsure about your order's eligibility, shoot us an email.</p>
              </div>
            </div>

            {/* Exchanges */}
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
                Exchanges
              </h2>
              
              <div className="text-gray-300">
                <p className="leading-relaxed">
                  Want something else? The fastest way is to place a new order after your return is approved.
                </p>
              </div>
            </div>

            {/* Refunds */}
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
                Refunds
              </h2>
              
              <div className="text-gray-300">
                <p className="leading-relaxed">
                  Once we inspect and approve your return, we'll refund your original payment method within 10 business days. If it's been longer than 15 business days since approval, email <a href="mailto:orbit@stickershuttle.com" className="text-blue-400 hover:text-blue-300">orbit@stickershuttle.com</a>.
                </p>
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