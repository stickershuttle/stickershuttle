import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { useCart } from '@/components/CartContext';
import Layout from '@/components/Layout';
import { getSupabase } from '@/lib/supabase';

export default function OrderSuccess() {
  const router = useRouter();
  const [countdown, setCountdown] = useState(5);
  const [isRedirecting, setIsRedirecting] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [guestEmail, setGuestEmail] = useState<string | null>(null);
  const [loadingGuestInfo, setLoadingGuestInfo] = useState(true);
  const { clearCart } = useCart();

  useEffect(() => {
    // Clear cart immediately when order success page loads
    // Clearing cart after successful payment
    clearCart();
    
    // Additional debug: Check if cart was cleared
    setTimeout(() => {
      const cartData = localStorage.getItem('cart');
      console.log('🛒 Cart after clearing:', cartData);
    }, 100);

    // Check user authentication
    const checkUserAndGuestInfo = async () => {
      try {
        const supabase = await getSupabase();
        const { data: { session } } = await supabase.auth.getSession();
        console.log('🔍 Order success session check:', {
          hasSession: !!session,
          hasUser: !!session?.user,
          userEmail: session?.user?.email
        });
        
        setUser(session?.user || null);

        // If no user is logged in, check session params for guest email and associated user
        if (!session?.user) {
          const urlParams = new URLSearchParams(window.location.search);
          const sessionId = urlParams.get('session_id');
          
          if (sessionId) {
            console.log('🔍 Checking for order with Stripe session:', sessionId);
            
            // Try to get order info and check if it's linked to a user
            const { data: orderData, error: orderError } = await supabase
              .from('orders_main')
              .select('guest_email, user_id, customer_email')
              .eq('stripe_session_id', sessionId)
              .single();
            
            if (orderData && !orderError) {
              console.log('📋 Order data found:', {
                hasUserId: !!orderData.user_id,
                guestEmail: orderData.guest_email,
                customerEmail: orderData.customer_email
              });
              
              // If order has a user_id but no current session, the user might have been logged out during redirect
              if (orderData.user_id) {
                console.log('⚠️ Order belongs to user but no active session - user may have been logged out during Stripe redirect');
                // Set the email for potential re-login
                setGuestEmail(orderData.customer_email || orderData.guest_email);
              } else if (orderData.guest_email) {
                console.log('✅ Found guest email:', orderData.guest_email);
                setGuestEmail(orderData.guest_email);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error checking user/guest info:', error);
      } finally {
        setLoadingGuestInfo(false);
      }
    };

    checkUserAndGuestInfo();

    // Always use 5 seconds countdown since we always go to dashboard
    setCountdown(5);

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
    // Always redirect to dashboard - user should be logged in after checkout
    console.log('🚀 Redirecting to dashboard after successful order');
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

            {/* Guest/Account Information */}
            {!user && guestEmail && (
              <div 
                className="mb-8 p-6 rounded-xl border-2"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(59, 130, 246, 0.08) 50%, rgba(59, 130, 246, 0.03) 100%)',
                  border: '2px solid rgba(59, 130, 246, 0.4)',
                  boxShadow: 'rgba(59, 130, 246, 0.2) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
                  backdropFilter: 'blur(12px)'
                }}
              >
                <div className="text-center mb-4">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <span className="text-2xl">📧</span>
                    <h3 className="text-xl font-bold text-white">Order Confirmation Sent!</h3>
                  </div>
                  <p className="text-blue-200 font-medium">
                    We've sent your order details to: <span className="font-mono">{guestEmail}</span>
                  </p>
                </div>
                
                <div 
                  className="p-4 rounded-lg text-center"
                  style={{
                    background: 'rgba(255, 193, 7, 0.1)',
                    border: '1px solid rgba(255, 193, 7, 0.3)'
                  }}
                >
                  <p className="text-yellow-300 text-sm font-medium mb-2">
                    🔐 Already have an account or just created one?
                  </p>
                  <Link
                    href={`/login?email=${encodeURIComponent(guestEmail)}&from=order-success`}
                    className="inline-block mt-2 px-6 py-2 rounded-lg font-semibold text-white transition-all duration-200 transform hover:scale-105 mr-2"
                    style={{
                      background: 'linear-gradient(135deg, rgba(255, 193, 7, 0.5) 0%, rgba(255, 193, 7, 0.35) 50%, rgba(255, 193, 7, 0.2) 100%)',
                      backdropFilter: 'blur(25px) saturate(200%)',
                      border: '1px solid rgba(255, 193, 7, 0.6)',
                      boxShadow: 'rgba(255, 193, 7, 0.15) 0px 4px 16px, rgba(255, 255, 255, 0.4) 0px 1px 0px inset'
                    }}
                  >
                    Sign In
                  </Link>
                  <Link
                    href={`/signup?email=${encodeURIComponent(guestEmail)}`}
                    className="inline-block mt-2 px-6 py-2 rounded-lg font-semibold text-white transition-all duration-200 transform hover:scale-105"
                    style={{
                      background: 'linear-gradient(135deg, rgba(34, 197, 94, 0.5) 0%, rgba(34, 197, 94, 0.35) 50%, rgba(34, 197, 94, 0.2) 100%)',
                      backdropFilter: 'blur(25px) saturate(200%)',
                      border: '1px solid rgba(34, 197, 94, 0.6)',
                      boxShadow: 'rgba(34, 197, 94, 0.15) 0px 4px 16px, rgba(255, 255, 255, 0.4) 0px 1px 0px inset'
                    }}
                  >
                    Create Account
                  </Link>
                  <div className="mt-4 space-y-1 text-blue-200 text-sm">
                    <p>🎯 Track your order in real-time</p>
                    <p>🔄 Get automatic 10% off on reorders</p>
                    <p>💰 Earn 5% back in store credits</p>
                    <p>📧 Exclusive deals and early access</p>
                  </div>
                </div>
              </div>
            )}

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
                    style={{ width: `${(5 - countdown) / 5 * 100}%` }}
                  />
                </div>
              </div>
            ) : (
              <div className="mb-6">
                <div className="flex items-center justify-center space-x-2 text-purple-400">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-400"></div>
                  <span>Redirecting...</span>
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