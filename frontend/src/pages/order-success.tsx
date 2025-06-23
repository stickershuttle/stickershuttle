import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useCart } from '@/components/CartContext';

export default function OrderSuccess() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const { clearCart } = useCart();

  useEffect(() => {
    // Clear cart immediately when order success page loads
    console.log('🛒 Clearing cart after successful payment');
    clearCart();

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
  }, [clearCart]);

  const handleRedirect = () => {
    setIsRedirecting(true);
    router.push('/account/dashboard?orderCompleted=true');
  };

  const handleManualRedirect = () => {
    handleRedirect();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-2xl w-full">
        {/* Success Card */}
        <div
          className="rounded-2xl p-8 text-center shadow-2xl"
          style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.2)'
          }}
        >
          {/* Success Icon */}
          <div className="mb-6">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center border-2 border-green-400/50">
              <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">🎉 Order Complete!</h1>
            <p className="text-xl text-green-300 font-semibold">Thank you for your purchase!</p>
          </div>

          {/* Order Details */}
          <div className="mb-8 p-4 rounded-xl bg-white/5 border border-white/10">
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
                <span className="text-green-400 font-bold text-2xl">{countdown}</span>{' '}
                seconds...
              </p>
              <div className="w-full bg-white/20 rounded-full h-2 mb-4">
                <div 
                  className="bg-green-400 h-2 rounded-full transition-all duration-1000 ease-linear"
                  style={{ width: `${((5 - countdown) / 5) * 100}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <div className="flex items-center justify-center space-x-2 text-green-400">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-green-400"></div>
                <span>Redirecting to dashboard...</span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="space-y-3">
            <button
              onClick={handleManualRedirect}
              disabled={isRedirecting}
              className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 
                         text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 
                         transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
            >
              🚀 Go to Dashboard Now
            </button>

            <div className="flex space-x-3">
              <Link
                href="/products"
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-lg 
                           transition-all duration-200 border border-white/20 hover:border-white/30 text-center"
              >
                🛍️ Shop More
              </Link>
              <Link
                href="/"
                className="flex-1 bg-white/10 hover:bg-white/20 text-white font-medium py-2 px-4 rounded-lg 
                           transition-all duration-200 border border-white/20 hover:border-white/30 text-center"
              >
                🏠 Home
              </Link>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-8 p-4 rounded-lg bg-blue-500/10 border border-blue-400/30">
            <p className="text-blue-300 text-sm font-medium mb-2">
              📧 What's Next?
            </p>
            <ul className="text-blue-200 text-sm text-left space-y-1">
              <li>• You'll receive an order confirmation email</li>
              <li>• Track your order progress in your dashboard</li>
              <li>• If you requested a proof, we'll send it for approval</li>
              <li>• Questions? Contact our support team anytime</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
} 