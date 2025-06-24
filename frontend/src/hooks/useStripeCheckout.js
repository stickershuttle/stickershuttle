import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { PROCESS_STRIPE_CART_ORDER } from '../lib/stripe-mutations';
import { getSupabase } from '../lib/supabase';
import stripePromise from '../lib/stripe';

export const useStripeCheckout = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [processStripeCartOrder] = useMutation(PROCESS_STRIPE_CART_ORDER);

  const processCheckout = async (cartItems, customerInfo, shippingAddress, billingAddress = null, orderNote = '', discountCode = null, discountAmount = 0, creditsToApply = 0) => {
    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Processing Stripe checkout...');
      
      // Step 1: Get current user context
      let currentUser = null;
      try {
        if (typeof window !== 'undefined') {
          const supabase = await getSupabase();
          const { data: { session } } = await supabase.auth.getSession();
          currentUser = session?.user || null;
          console.log('👤 User context:', currentUser ? currentUser.email : 'Guest user');
        }
      } catch (userError) {
        console.warn('Could not get user context, proceeding as guest:', userError);
      }

      // Step 2: Process order through API
      console.log('📝 Processing order with Stripe...');
      console.log('🛒 Cart items being processed:', cartItems.length, 'items');
      console.log('📦 Cart items details:', cartItems);

      const { data: orderData } = await processStripeCartOrder({
        variables: {
          input: {
            userId: currentUser?.id || null,
            guestEmail: !currentUser ? customerInfo.email : null,
            cartItems: cartItems.map(item => ({
              productId: item.product?.id || item.productId || `PRODUCT-${Date.now()}`,
              productName: item.product?.name || item.name || item.title || 'Custom Stickers',
              productCategory: item.product?.category || item.category || 'Custom Stickers',
              sku: item.product?.sku || item.sku || `${item.product?.id || 'CUSTOM'}-${Date.now()}`,
              quantity: item.quantity || 1,
              unitPrice: parseFloat(item.unitPrice || item.price || item.totalPrice || 0),
              totalPrice: parseFloat(item.totalPrice || item.price || 0),
              calculatorSelections: item.customization?.selections || item.calculatorSelections || {},
              customFiles: item.customization?.customFiles || item.customFiles || [],
              customerNotes: item.customization?.notes || item.customerNotes || '',
              instagramHandle: item.customization?.instagramHandle || item.instagramHandle || '',
              instagramOptIn: item.customization?.instagramOptIn || item.instagramOptIn || false
            })),
            customerInfo: {
              firstName: customerInfo.firstName || customerInfo.first_name || '',
              lastName: customerInfo.lastName || customerInfo.last_name || '',
              email: customerInfo.email,
              phone: customerInfo.phone || ''
            },
            shippingAddress,
            billingAddress: billingAddress || shippingAddress,
            orderNote,
            discountCode,
            discountAmount,
            creditsToApply
          }
        }
      });

      const result = orderData.processStripeCartOrder;
      console.log('📊 Stripe order processing result:', result);

      if (!result.success) {
        console.error('❌ Order processing failed with errors:', result.errors);
        console.error('❌ Full result object:', JSON.stringify(result, null, 2));
        console.error('❌ Backend error message:', result.message);
        console.error('❌ Backend error details:', result.errors);
        
        // Try to provide more specific error info
        const errorMessage = result.message || 'Order processing failed';
        const errorDetails = result.errors ? ` Details: ${JSON.stringify(result.errors)}` : '';
        throw new Error(`${errorMessage}${errorDetails}`);
      }

      // Step 3: Get Stripe instance
      if (!stripePromise) {
        throw new Error('Stripe is not configured. Please check NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY environment variable.');
      }
      
      const stripe = await stripePromise;
      
      if (!stripe) {
        throw new Error('Stripe failed to load');
      }

      // Step 4: Redirect to Stripe Checkout
      const { error: stripeError } = await stripe.redirectToCheckout({
        sessionId: result.sessionId
      });

      if (stripeError) {
        console.error('❌ Stripe redirect error:', stripeError);
        throw new Error(stripeError.message);
      }

      return {
        success: true,
        customerOrder: result.customerOrder,
        sessionId: result.sessionId,
        checkoutUrl: result.checkoutUrl
      };

    } catch (err) {
      console.error('❌ Stripe checkout error:', err);
      
      let errorMessage = 'Checkout failed';
      if (err.graphQLErrors && err.graphQLErrors.length > 0) {
        errorMessage = err.graphQLErrors[0].message;
      } else if (err.networkError) {
        errorMessage = `Network error: ${err.networkError.message}`;
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
      
      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    processCheckout,
    loading,
    error
  };
}; 