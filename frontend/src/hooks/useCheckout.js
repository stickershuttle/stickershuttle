import { useState } from 'react';
import { useMutation } from '@apollo/client';
import { CREATE_DRAFT_ORDER, CREATE_CHECKOUT_URL } from '../lib/shopify-mutations';

export const useCheckout = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const [createDraftOrder] = useMutation(CREATE_DRAFT_ORDER);
  const [createCheckoutUrl] = useMutation(CREATE_CHECKOUT_URL);

  const processCheckout = async (orderData) => {
    setLoading(true);
    setError(null);

    try {
      console.log('🛒 Creating draft order...', orderData);
      
      // Step 1: Create draft order
      const { data: draftOrderData } = await createDraftOrder({
        variables: { input: orderData }
      });

      const draftOrder = draftOrderData.createDraftOrder;
      console.log('✅ Draft order created:', draftOrder);

      // Step 2: Get checkout URL (the draft order already has invoice_url)
      const checkoutUrl = draftOrder.invoice_url;

      if (!checkoutUrl) {
        throw new Error('No checkout URL available');
      }

      console.log('🔗 Redirecting to checkout:', checkoutUrl);

      // Step 3: Redirect to Shopify checkout
      window.location.href = checkoutUrl;

      return {
        success: true,
        draftOrder,
        checkoutUrl
      };

    } catch (err) {
      console.error('❌ Checkout error:', err);
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
    processCheckout,
    createQuickCheckout,
    loading,
    error
  };
}; 