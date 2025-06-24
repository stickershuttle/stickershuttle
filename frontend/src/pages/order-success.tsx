import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useCart } from '@/components/CartContext';
import Layout from '@/components/Layout';

export default function OrderSuccess() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { clearCart } = useCart();

  useEffect(() => {
    // Clear cart immediately when order success page loads
    console.log('🛒 Clearing cart after successful payment');
    clearCart();
    
    // Additional debug: Check if cart was cleared
    setTimeout(() => {
      const cartData = localStorage.getItem('cart');
      console.log('🛒 Cart after clearing:', cartData);
    }, 100);

    // Start countdown
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleRedirect();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [clearCart]); // Include clearCart in dependencies

  const handleRedirect = () => {
    setIsRedirecting(true);
    router.push('/account/dashboard?orderCompleted=true');
  };

  const handleManualRedirect = () => {
    handleRedirect();
  };

  return (
    <Layout title="Order Complete - Sticker Shuttle">
      <section className="py-8">
        <div className="w-[90%] md:w-[70%] xl:w-[50%] mx-auto px-4">
          {/* Success Card */}
          <div
            className="rounded-2xl p-8 text-center shadow-2xl"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)',
              backdropFilter: 'blur(12px)'
            }}
          >
            {/* Success Icon */}
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center border-2 border-purple-400/50">
                <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">🎉 Order Complete!</h1>
              <p className="text-xl text-purple-300 font-semibold">Thank you for your purchase!</p>
            </div>

            {/* Order Details */}
            <div 
              className="mb-8 p-4 rounded-xl border"
              style={{
                background: 'rgba(255, 255, 255, 0.02)',
                border: '1px solid rgba(255, 255, 255, 0.08)'
              }}
            >
              <p className="text-white/80 mb-2">
                Your payment has been processed successfully.
              </p>
              <p className="text-white/60 text-sm">
                You'll receive a confirmation email with your order details shortly.
              </p>
            </div>

            {/* Countdown or Redirect Status */}
            {!isRedirecting ? (
              <div className="mb-6">
                <p className="text-white/80 mb-4">
                  Redirecting to your dashboard in{' '}
                  <span className="text-purple-400 font-bold text-2xl">{countdown}</span>{' '}
                  seconds...
                </p>
                <div 
                  className="w-full rounded-full h-2 mb-4"
                  style={{ background: 'rgba(255, 255, 255, 0.1)' }}
                >
                  <div 
                    className="bg-purple-400 h-2 rounded-full transition-all duration-1000 ease-linear"
                    style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <div className="flex items-center justify-center space-x-2 text-purple-400">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-400"></div>
                  <span>Redirecting to dashboard...</span>
                </div>
              </div>
            )}

            {/* Action Button */}
            <div className="mb-6">
              <button
                onClick={handleManualRedirect}
                disabled={isRedirecting}
                className="w-full text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 
                           transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
                style={{
                  background: 'rgba(147, 51, 234, 0.25)',
                  border: '1px solid rgba(147, 51, 234, 0.5)',
                  backdropFilter: 'blur(8px)',
                  boxShadow: '0 4px 16px rgba(147, 51, 234, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.15)'
                }}
              >
                🚀 Go to Dashboard Now
              </button>
            </div>

            {/* Additional Info */}
            <div 
              className="mt-8 p-4 rounded-lg border"
              style={{
                background: 'rgba(59, 130, 246, 0.05)',
                border: '1px solid rgba(59, 130, 246, 0.2)'
              }}
            >
              <p className="text-blue-300 text-sm font-medium mb-2 text-center">
                📧 What's Next?
              </p>
              <ul className="text-blue-200 text-sm text-center space-y-1">
                <li>• You'll receive an order confirmation email</li>
                <li>• Track your order progress in your dashboard</li>
                <li>• If you requested a proof, we'll send it for approval</li>
                <li>• Questions? Contact our support team anytime</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </Layout>
  );
} 