import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { PROCESS_CART_ORDER, CLAIM_GUEST_ORDERS } from '../lib/shopify-mutations';
import { getSupabase } from '../lib/supabase';

export const useCartCheckout = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [processCartOrder] = useMutation(PROCESS_CART_ORDER);
  const [claimGuestOrders] = useMutation(CLAIM_GUEST_ORDERS);

  const processCart = async (cartItems, customerInfo, shippingAddress, billingAddress = null, orderNote = '') => {
    setLoading(true);
    setError(null);

    try {
      console.log('🛒 Processing cart with user context...', cartItems.length, 'items');
      
      // Get current user context
      let user = null;
      try {
        if (typeof window !== 'undefined') {
          const supabase = await getSupabase();
          const { data: { session } } = await supabase.auth.getSession();
          user = session?.user || null;
        }
      } catch (userError) {
        console.error('Error getting user context:', userError);
        // Continue without user context (guest checkout)
      }

      // Prepare cart items for API
      const cartItemsForAPI = cartItems.map(item => ({
        productId: item.product.id || item.product.sku,
        productName: item.product.name,
        productCategory: item.product.category,
        sku: item.product.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        calculatorSelections: item.customization.selections || {},
        customFiles: item.customization.customFiles || [],
        customerNotes: item.customization.notes || '',
        instagramHandle: item.customization.instagramOptIn ? (item.customization.instagramHandle || '') : '',
        instagramOptIn: item.customization.instagramOptIn || false
      }));

      // Process the order
      const { data } = await processCartOrder({
        variables: {
          input: {
            userId: user?.id || null,
            guestEmail: user ? null : customerInfo.email,
            cartItems: cartItemsForAPI,
            customerInfo: {
              firstName: customerInfo.firstName,
              lastName: customerInfo.lastName,
              email: customerInfo.email,
              phone: customerInfo.phone
            },
            shippingAddress: {
              first_name: shippingAddress.firstName,
              last_name: shippingAddress.lastName,
              company: shippingAddress.company || '',
              address1: shippingAddress.address1,
              address2: shippingAddress.address2 || '',
              city: shippingAddress.city,
              province: shippingAddress.province,
              country: shippingAddress.country,
              zip: shippingAddress.zip,
              phone: shippingAddress.phone || customerInfo.phone
            },
            billingAddress: billingAddress ? {
              first_name: billingAddress.firstName,
              last_name: billingAddress.lastName,
              company: billingAddress.company || '',
              address1: billingAddress.address1,
              address2: billingAddress.address2 || '',
              city: billingAddress.city,
              province: billingAddress.province,
              country: billingAddress.country,
              zip: billingAddress.zip,
              phone: billingAddress.phone || customerInfo.phone
            } : null,
            orderNote
          }
        }
      });

      const result = data.processCartOrder;

      if (!result.success) {
        throw new Error(result.errors?.join(', ') || result.message || 'Order processing failed');
      }

      console.log('✅ Cart order processed successfully:', result.customerOrder?.id);

      // If user is logged in and we created a customer order, claim any existing guest orders
      if (user && result.customerOrder) {
        try {
          await claimGuestOrders({
            variables: {
              userId: user.id,
              email: user.email
            }
          });
          console.log('✅ Guest orders claimed for user');
        } catch (claimError) {
          console.error('⚠️ Failed to claim guest orders:', claimError);
          // Don't fail the whole process for this
        }
      }

      // Redirect to Shopify checkout
      if (result.shopifyOrder?.invoice_url) {
        console.log('🔗 Redirecting to Shopify checkout:', result.shopifyOrder.invoice_url);
        window.location.href = result.shopifyOrder.invoice_url;
      } else {
        throw new Error('No checkout URL available');
      }

      return {
        success: true,
        customerOrder: result.customerOrder,
        shopifyOrder: result.shopifyOrder,
        message: result.message
      };

    } catch (err) {
      console.error('❌ Cart checkout error:', err);
      const errorMessage = err.message || 'Checkout failed';
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
    processCart,
    loading,
    error
  };
}; 