import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getSupabase } from '@/lib/supabase';
import { useStripeCheckout } from '@/hooks/useStripeCheckout';
import { useOrderCompletion } from '@/hooks/useOrderCompletion';
import { useCart } from '@/components/CartContext';
import { useQuery } from '@apollo/client';
import { GET_USER_CREDIT_BALANCE } from '@/lib/credit-mutations';

interface CartCheckoutButtonProps {
  cartItems: any[];
  className?: string;
  children?: React.ReactNode;
  discountCode?: string;
  discountAmount?: number;
  onCheckoutStart?: () => void;
  onCheckoutError?: (error: string) => void;
  onCheckoutSuccess?: () => void;
  creditsToApply?: number;
  onCreditsChange?: (credits: number) => void;
}

const CartCheckoutButton: React.FC<CartCheckoutButtonProps> = ({
  cartItems,
  className = '',
  children,
  discountCode,
  discountAmount,
  onCheckoutStart,
  onCheckoutError,
  onCheckoutSuccess,
  creditsToApply = 0,
  onCreditsChange
}) => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const { processCheckout, loading, error } = useStripeCheckout();
  const { startMonitoring, stopMonitoring, isMonitoring } = useOrderCompletion();
  const { clearCart } = useCart();
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditAmount, setCreditAmount] = useState(creditsToApply);
  const [showGuestEmailModal, setShowGuestEmailModal] = useState(false);
  const [guestEmail, setGuestEmail] = useState('');
  
  // Sync local credit amount with prop changes
  useEffect(() => {
    setCreditAmount(creditsToApply);
  }, [creditsToApply]);
  
  // Fetch user's credit balance if logged in
  const { data: creditData } = useQuery(GET_USER_CREDIT_BALANCE, {
    variables: { userId: user?.id },
    skip: !user?.id
  });

  // Helper function to capitalize first name
  const capitalizeFirstName = (firstName: string): string => {
    if (!firstName) return '';
    return firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
  };

  // Get user context
  useEffect(() => {
    const getUser = async () => {
      try {
        if (typeof window !== 'undefined') {
          const supabase = await getSupabase();
          const { data: { session } } = await supabase.auth.getSession();
          setUser(session?.user || null);
        }
      } catch (error) {
        console.error('Error getting user:', error);
      }
    };
    getUser();
  }, []);

  // Listen for order completion events
  useEffect(() => {
    const handleOrderCompletion = (event: CustomEvent) => {
      console.log('🎉 Order completion detected!', event.detail);
      
      // Clear cart immediately - don't wait for onCheckoutSuccess
      console.log('🛒 Clearing cart due to order completion event');
      clearCart();
      
      // Call the callback (for additional UI updates)
      onCheckoutSuccess?.();
      
      // Show success message and redirect
      setTimeout(() => {
        router.push('/account/dashboard?orderCompleted=true');
      }, 1000);
    };

    window.addEventListener('newOrderCompleted', handleOrderCompletion as EventListener);
    
    return () => {
      window.removeEventListener('newOrderCompleted', handleOrderCompletion as EventListener);
      stopMonitoring(); // Clean up monitoring on unmount
    };
  }, [router, onCheckoutSuccess, stopMonitoring, clearCart]);

  // Fallback: Check for successful return from Stripe checkout
  useEffect(() => {
    const checkStripeReturn = () => {
      // Check if we're returning from Stripe checkout with success
      const urlParams = new URLSearchParams(window.location.search);
      const fromStripe = sessionStorage.getItem('stripe_checkout_initiated');
      
      if (fromStripe && urlParams.get('session_id')) {
        console.log('🔄 Detected return from Stripe with session_id - clearing cart as fallback');
        clearCart();
        sessionStorage.removeItem('stripe_checkout_initiated');
      }
    };

    // Check immediately and also on focus (in case user returns to tab)
    checkStripeReturn();
    window.addEventListener('focus', checkStripeReturn);
    
    return () => {
      window.removeEventListener('focus', checkStripeReturn);
    };
  }, [clearCart]);

  const handleGuestEmailSubmit = () => {
    if (guestEmail && guestEmail.includes('@')) {
      setShowGuestEmailModal(false);
      // Now proceed with checkout
      handleDirectCheckout();
    }
  };

  const handleDirectCheckout = async () => {
    onCheckoutStart?.();

    try {
      // Check if user is logged in or we have guest email
      if (!user && !guestEmail) {
        setShowGuestEmailModal(true);
        return;
      }

      // Check if Stripe is configured
      if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
        throw new Error('Stripe is not configured. Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in your environment variables.');
      }
      
      console.log('🚀 Phase 2: Direct enhanced checkout...');
      console.log('👤 User context:', user ? `Logged in as ${capitalizeFirstName(user.user_metadata?.first_name || user.email?.split('@')[0] || 'User')}` : `Guest user: ${guestEmail}`);
      
      // Set flag to detect return from Stripe
      sessionStorage.setItem('stripe_checkout_initiated', 'true');
      
      // Create minimal customer info - Shopify will collect the rest
      const customerInfo = {
        firstName: user?.user_metadata?.first_name || '',
        lastName: user?.user_metadata?.last_name || '',
        email: user?.email || guestEmail || '',
        phone: user?.user_metadata?.phone || ''
      };

      // Create minimal shipping address - Shopify will collect the full address
      const shippingAddress = {
        first_name: user?.user_metadata?.first_name || '',
        last_name: user?.user_metadata?.last_name || '',
        address1: '', // Let Shopify collect this
        address2: '',
        city: '',
        province: '',
        country: 'United States',
        zip: '',
        phone: user?.user_metadata?.phone || ''
      };

      // Start monitoring for order completion before checkout
      if (user) {
        startMonitoring();
      }

      const result = await processCheckout(
        cartItems,
        customerInfo,
        shippingAddress,
        null, // billing address
        '', // No automatic order note
        discountCode,
        discountAmount,
        creditsToApply || 0 // Pass credits to apply
      );

      if (result.success) {
        console.log('✅ Phase 2: Direct checkout successful! Starting order monitoring...');
        // Don't call onCheckoutSuccess here - wait for order completion
        // Redirect will be handled by processEnhancedCheckout to Shopify, then by monitoring
      } else {
        sessionStorage.removeItem('stripe_checkout_initiated'); // Clean up on failure
        stopMonitoring(); // Stop monitoring if checkout failed
        throw new Error(result.error || 'Checkout failed');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Checkout failed';
      console.error('❌ Phase 2: Direct checkout error:', errorMessage);
      sessionStorage.removeItem('stripe_checkout_initiated'); // Clean up on error
      stopMonitoring(); // Stop monitoring on error
      onCheckoutError?.(errorMessage);
    }
  };

  // Dashboard tab styled button - matches the active tab styling
  const dashboardTabButtonClass = `
    block p-4 shadow-2xl hover:shadow-3xl transition-all duration-500 transform hover:scale-105 
    text-left w-full relative overflow-hidden rounded-2xl
    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
  `.trim();

  const activeTabStyle = {
    background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.4) 0%, rgba(16, 185, 129, 0.25) 50%, rgba(16, 185, 129, 0.1) 100%)',
    backdropFilter: 'blur(25px) saturate(180%)',
    border: '1px solid rgba(16, 185, 129, 0.4)',
    boxShadow: '0 4px 16px rgba(16, 185, 129, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
  };

  return (
    <>
      {/* Guest Email Modal */}
      {showGuestEmailModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div 
            className="rounded-2xl p-6 max-w-md w-full mx-4"
            style={{
              background: 'rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: 'rgba(0, 0, 0, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.1) 0px 1px 0px inset',
              backdropFilter: 'blur(12px)'
            }}
          >
            <h3 className="text-xl font-semibold text-white mb-4">Enter Your Email</h3>
            <p className="text-gray-300 mb-6">We need your email address to process your order and send you updates.</p>
            
            <input
              type="email"
              value={guestEmail}
              onChange={(e) => setGuestEmail(e.target.value)}
              placeholder="your.email@example.com"
              className="w-full px-4 py-3 rounded-lg text-white mb-4"
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(10px)'
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleGuestEmailSubmit();
                }
              }}
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowGuestEmailModal(false)}
                className="flex-1 px-4 py-2 rounded-lg text-white border border-gray-500 hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleGuestEmailSubmit}
                disabled={!guestEmail || !guestEmail.includes('@')}
                className="flex-1 px-4 py-2 rounded-lg text-white font-semibold transition-all disabled:opacity-50"
                style={{
                  background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.4) 0%, rgba(59, 130, 246, 0.25) 50%, rgba(59, 130, 246, 0.1) 100%)',
                  backdropFilter: 'blur(25px) saturate(180%)',
                  border: '1px solid rgba(59, 130, 246, 0.4)',
                  boxShadow: 'rgba(59, 130, 246, 0.3) 0px 8px 32px, rgba(255, 255, 255, 0.2) 0px 1px 0px inset'
                }}
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
      
      <button
        onClick={handleDirectCheckout}
        disabled={loading || cartItems.length === 0}
        className={className || dashboardTabButtonClass}
        style={activeTabStyle}
      >
      {loading ? (
        <div className="flex items-center justify-center space-x-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          <span className="text-white font-semibold">Processing...</span>
        </div>
      ) : (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg"
                 style={{
                   background: 'linear-gradient(135deg, #10b981, #34d399)',
                   boxShadow: '0 4px 12px rgba(16, 185, 129, 0.15)'
                 }}>
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
              </svg>
            </div>
            <div>
              <h4 className="font-semibold text-white text-sm">
                {children || '🚀 Go to Checkout'}
              </h4>
              {user && (
                <>
                  <p className="text-xs text-green-200">
                    Logged in as {capitalizeFirstName(user.user_metadata?.first_name || user.email?.split('@')[0] || 'User')}
                  </p>
                  {creditData?.getUserCreditBalance?.balance > 0 && (
                    <p className="text-xs text-green-300 mt-1">
                      ${creditData.getUserCreditBalance.balance.toFixed(2)} store credit available
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </button>
    </>
  );
};

export default CartCheckoutButton; 