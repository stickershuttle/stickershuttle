import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { CREATE_DRAFT_ORDER, CREATE_CHECKOUT_URL, PROCESS_CART_ORDER } from '../lib/shopify-mutations';
import { getSupabase } from '../lib/supabase';

export const useCheckout = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [createDraftOrder] = useMutation(CREATE_DRAFT_ORDER);
  const [createCheckoutUrl] = useMutation(CREATE_CHECKOUT_URL);
  const [processCartOrder] = useMutation(PROCESS_CART_ORDER);

  // NEW: Enhanced checkout with user context
  const processEnhancedCheckout = async (cartItems, customerInfo, shippingAddress, billingAddress = null, orderNote = '') => {
    setLoading(true);
    setError(null);

    try {
      console.log('🚀 Phase 2: Processing enhanced checkout with user context...');
      
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

      // Step 2: Use new processCartOrder mutation
      console.log('📝 Sending processCartOrder with input:', {
        userId: currentUser?.id || null,
        guestEmail: !currentUser ? customerInfo.email : null,
        cartItems: cartItems.slice(0, 1), // Log only first item to avoid clutter
        customerInfo,
        shippingAddress,
        orderNote
      });

      const { data: orderData } = await processCartOrder({
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
            orderNote
          }
        }
      });

      const result = orderData.processCartOrder;
      console.log('📊 Phase 2: Order processing result:', result);

      if (!result.success) {
        console.error('❌ Order processing failed with errors:', result.errors);
        console.error('❌ Error message:', result.message);
        
        // Show detailed error message if available
        let detailedError = result.message || 'Order processing failed';
        if (result.errors && result.errors.length > 0) {
          detailedError += '\nDetails: ' + result.errors.join(', ');
        }
        throw new Error(detailedError);
      }

      // Step 3: Get checkout URL from Shopify order
      const checkoutUrl = result.shopifyOrder?.invoice_url;

      if (!checkoutUrl) {
        throw new Error('No checkout URL available');
      }

      console.log('🔗 Phase 2: Redirecting to checkout:', checkoutUrl);

      // Step 4: Redirect to Shopify checkout
      window.location.href = checkoutUrl;

      return {
        success: true,
        customerOrder: result.customerOrder,
        shopifyOrder: result.shopifyOrder,
        checkoutUrl
      };

    } catch (err) {
      console.error('❌ Phase 2: Enhanced checkout error:', err);
      console.error('❌ GraphQL errors:', err.graphQLErrors);
      console.error('❌ Network error:', err.networkError);
      console.error('❌ Error details:', JSON.stringify(err, null, 2));
      
      // Extract meaningful error message
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

  // LEGACY: Keep old checkout for fallback
  const processCheckout = async (orderData) => {
    setLoading(true);
    setError(null);

    try {
      console.log('⚠️ Using legacy checkout flow...', orderData);
      
      // Step 1: Create draft order
      const { data: draftOrderData } = await createDraftOrder({
        variables: { input: orderData }
      });

      const draftOrder = draftOrderData.createDraftOrder;
      console.log('✅ Legacy draft order created:', draftOrder);

      // Step 2: Get checkout URL (the draft order already has invoice_url)
      const checkoutUrl = draftOrder.invoice_url;

      if (!checkoutUrl) {
        throw new Error('No checkout URL available');
      }

      console.log('🔗 Redirecting to legacy checkout:', checkoutUrl);

      // Step 3: Redirect to Shopify checkout
      window.location.href = checkoutUrl;

      return {
        success: true,
        draftOrder,
        checkoutUrl
      };

    } catch (err) {
      console.error('❌ Legacy checkout error:', err);
      setError(err.message || 'Checkout failed');
      
      return {
        success: false,
        error: err.message || 'Checkout failed'
      };
    } finally {
      setLoading(false);
    }
  };

  const createQuickCheckout = async (items, customerInfo = {}) => {
    const orderData = {
      lineItems: items.map(item => ({
        title: item.title || item.name,
        quantity: item.quantity || 1,
        price: item.price.toString(),
        sku: item.sku || `ITEM-${Date.now()}`,
        ...(item.variant_id && { variant_id: item.variant_id }),
        ...(item.product_id && { product_id: item.product_id })
      })),
      ...(customerInfo.email && { email: customerInfo.email }),
      ...(customerInfo.customer && { customer: customerInfo.customer }),
      ...(customerInfo.shippingAddress && { shippingAddress: customerInfo.shippingAddress }),
      ...(customerInfo.billingAddress && { billingAddress: customerInfo.billingAddress }),
      note: customerInfo.note || 'Order from Sticker Shuttle',
      tags: customerInfo.tags || 'website,checkout'
    };

    return await processCheckout(orderData);
  };

  return {
    processEnhancedCheckout, // NEW: Phase 2 enhanced checkout
    processCheckout,         // LEGACY: Keep for fallback
    createQuickCheckout,
    loading,
    error
  };
}; 