import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { getSupabase } from '@/lib/supabase';
import { useStripeCheckout } from '@/hooks/useStripeCheckout';
import { useOrderCompletion } from '@/hooks/useOrderCompletion';
import { useCart } from '@/components/CartContext';

interface CartCheckoutButtonProps {
  cartItems: any[];
  className?: string;
  children?: React.ReactNode;
  onCheckoutStart?: () => void;
  onCheckoutError?: (error: string) => void;
  onCheckoutSuccess?: () => void;
}

const CartCheckoutButton: React.FC<CartCheckoutButtonProps> = ({
  cartItems,
  className = '',
  children,
  onCheckoutStart,
  onCheckoutError,
  onCheckoutSuccess
}) => {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const { processCheckout, loading, error } = useStripeCheckout();
  const { startMonitoring, stopMonitoring, isMonitoring } = useOrderCompletion();
  const { clearCart } = useCart();

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

  const handleDirectCheckout = async () => {
    onCheckoutStart?.();

    try {
      // Check if Stripe is configured
      if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
        throw new Error('Stripe is not configured. Please set NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY in your environment variables.');
      }
      
      console.log('🚀 Phase 2: Direct enhanced checkout...');
      console.log('👤 User context:', user ? `Logged in as ${capitalizeFirstName(user.user_metadata?.first_name || user.email?.split('@')[0] || 'User')}` : 'Guest user');
      
      // Set flag to detect return from Stripe
      sessionStorage.setItem('stripe_checkout_initiated', 'true');
      
      // Create minimal customer info - Shopify will collect the rest
      const customerInfo = {
        firstName: user?.user_metadata?.first_name || '',
        lastName: user?.user_metadata?.last_name || '',
        email: user?.email || '',
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
        await startMonitoring();
      }

      const result = await processCheckout(
        cartItems,
        customerInfo,
        shippingAddress,
        null, // billing address
        'Direct checkout from cart'
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
    boxShadow: '0 8px 32px rgba(16, 185, 129, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.2)'
  };

  return (
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
                <p className="text-xs text-green-200">
                  Logged in as {capitalizeFirstName(user.user_metadata?.first_name || user.email?.split('@')[0] || 'User')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </button>
  );
};

export default CartCheckoutButton; 