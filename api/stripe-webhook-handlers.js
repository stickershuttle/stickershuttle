const express = require('express');
const stripeClient = require('./stripe-client');
const supabaseClient = require('./supabase-client');

const router = express.Router();

// Middleware to parse raw body for webhook verification
router.use(express.raw({ type: 'application/json' }));

// Main webhook endpoint
router.post('/stripe', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!endpointSecret) {
    console.error('❌ STRIPE_WEBHOOK_SECRET not configured');
    return res.status(500).send('Webhook configuration error');
  }

  let event;

  try {
    // In development, allow bypassing signature verification for testing
    if (process.env.NODE_ENV === 'development' && endpointSecret === 'whsec_test_secret') {
      console.log('⚠️  Development mode: Bypassing webhook signature verification');
      event = JSON.parse(req.body.toString());
    } else {
      event = stripeClient.verifyWebhookSignature(req.body, sig, endpointSecret);
    }
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Handle the event
  try {
    console.log(`📦 Stripe webhook received: ${event.type}`);
    
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
        
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
        
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;
        
      case 'charge.refunded':
        await handleChargeRefunded(event.data.object);
        break;
        
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('❌ Error processing webhook:', error);
    res.status(500).send('Webhook processing error');
  }
});

// Handle successful checkout session
async function handleCheckoutSessionCompleted(session) {
  console.log('💰 Checkout session completed:', session.id);
  console.log('💰 Payment status:', session.payment_status);
  
  if (session.payment_status !== 'paid') {
    console.log('⏭️ Session not paid yet, skipping...');
    return;
  }

  try {
    // Get full session details with line items
    const fullSession = await stripeClient.getCheckoutSession(session.id);
    
    // Extract metadata
    const metadata = fullSession.metadata || {};
    const cartMetadata = metadata.cartMetadata ? JSON.parse(metadata.cartMetadata) : null;
    
    // Get customer information
    const customer = fullSession.customer_details || {};
    const shippingAddress = fullSession.shipping_details?.address || {};
    
    // Check if we have an existing order to update
    const existingOrderId = metadata.customerOrderId;
    
    if (existingOrderId && supabaseClient.isReady()) {
      console.log('📝 Updating existing order:', existingOrderId);
      
      // Update the existing order with payment details
      const client = supabaseClient.getServiceClient();
      
      // Generate order number (e.g., SS-2024-001234)
      const orderNumber = await generateOrderNumber(client);
      
      const { data: updatedOrder, error: updateError } = await client
        .from('orders_main')
        .update({
          stripe_payment_intent_id: fullSession.payment_intent,
          stripe_checkout_session_id: session.id,
          order_status: 'Creating Proofs',
          financial_status: 'paid',
          order_number: orderNumber,
          subtotal_price: (fullSession.amount_subtotal / 100).toFixed(2),
          total_tax: ((fullSession.amount_total - fullSession.amount_subtotal) / 100).toFixed(2),
          total_price: (fullSession.amount_total / 100).toFixed(2),
          // Update shipping address from Stripe if provided
          shipping_address: {
            line1: shippingAddress.line1,
            line2: shippingAddress.line2,
            city: shippingAddress.city,
            state: shippingAddress.state,
            postal_code: shippingAddress.postal_code,
            country: shippingAddress.country,
          },
          order_updated_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingOrderId)
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Error updating order:', updateError);
        throw updateError;
      }
      
      console.log('✅ Order updated successfully:', updatedOrder?.id);
      
      // Update line items with Stripe line item IDs if needed
      if (fullSession.line_items?.data) {
        for (const lineItem of fullSession.line_items.data) {
          const itemMetadata = lineItem.price.product.metadata || {};
          
          // Update order items with Stripe line item ID
          await client
            .from('order_items')
            .update({
              stripe_line_item_id: lineItem.id,
              updated_at: new Date().toISOString()
            })
            .eq('customer_order_id', existingOrderId)
            .eq('product_id', itemMetadata.productId || 'custom-product');
        }
      }
      
      return;
    }
    
    // If no existing order, create a new one (fallback for direct Stripe checkouts)
    console.log('📝 No existing order found, creating new order...');
    
    // Create order data for Supabase
    const orderData = {
      user_id: metadata.userId !== 'guest' ? metadata.userId : null,
      guest_email: metadata.userId === 'guest' ? customer.email : null,
      stripe_payment_intent_id: fullSession.payment_intent,
      stripe_checkout_session_id: session.id,
      order_status: 'Creating Proofs',
      financial_status: 'paid',
      fulfillment_status: 'unfulfilled',
      subtotal_price: (fullSession.amount_subtotal / 100).toFixed(2),
      total_tax: ((fullSession.amount_total - fullSession.amount_subtotal) / 100).toFixed(2),
      total_price: (fullSession.amount_total / 100).toFixed(2),
      currency: fullSession.currency.toUpperCase(),
      customer_first_name: customer.name?.split(' ')[0] || '',
      customer_last_name: customer.name?.split(' ').slice(1).join(' ') || '',
      customer_email: customer.email,
      customer_phone: customer.phone,
      shipping_address: {
        line1: shippingAddress.line1,
        line2: shippingAddress.line2,
        city: shippingAddress.city,
        state: shippingAddress.state,
        postal_code: shippingAddress.postal_code,
        country: shippingAddress.country,
      },
      billing_address: fullSession.customer_details?.address || shippingAddress,
      order_note: metadata.orderNote || '',
      order_created_at: new Date().toISOString(),
      order_updated_at: new Date().toISOString(),
    };

    // Save to Supabase
    if (supabaseClient.isReady()) {
      const order = await supabaseClient.createCustomerOrder(orderData);
      
      if (order && fullSession.line_items?.data) {
        // Create order items
        const orderItems = fullSession.line_items.data.map(lineItem => {
          const itemMetadata = lineItem.price.product.metadata || {};
          
          return {
            customer_order_id: order.id,
            stripe_line_item_id: lineItem.id,
            product_id: itemMetadata.productId || 'custom-product',
            product_name: lineItem.description || lineItem.price.product.name,
            product_category: itemMetadata.category || 'Custom Stickers',
            sku: itemMetadata.sku || 'CUSTOM',
            quantity: lineItem.quantity,
            unit_price: (lineItem.price.unit_amount / 100).toFixed(2),
            total_price: (lineItem.amount_total / 100).toFixed(2),
            calculator_selections: itemMetadata.calculatorSelections || {},
            custom_files: cartMetadata?.customFiles || [],
            customer_notes: cartMetadata?.customerNotes || '',
            instagram_handle: cartMetadata?.instagramHandle || '',
            instagram_opt_in: cartMetadata?.instagramOptIn || false,
            fulfillment_status: 'unfulfilled',
          };
        });
        
        await supabaseClient.createOrderItems(orderItems);
      }
      
      console.log('✅ New order created:', order?.id);
    }
    
  } catch (error) {
    console.error('❌ Error processing checkout session:', error);
    throw error;
  }
}

// Handle successful payment intent
async function handlePaymentIntentSucceeded(paymentIntent) {
  console.log('💳 Payment intent succeeded:', paymentIntent.id);
  // Payment intents are usually handled via checkout.session.completed
  // This is here as a backup or for custom payment flows
}

// Handle failed payment
async function handlePaymentIntentFailed(paymentIntent) {
  console.log('❌ Payment intent failed:', paymentIntent.id);
  
  // Update order status if exists
  if (paymentIntent.metadata?.customerOrderId && supabaseClient.isReady()) {
    await supabaseClient.updateOrderStatus(paymentIntent.metadata.customerOrderId, {
      financial_status: 'failed',
      order_status: 'Payment Failed'
    });
  }
}

// Handle refund
async function handleChargeRefunded(charge) {
  console.log('💸 Charge refunded:', charge.id);
  
  // Update order status to refunded
  const paymentIntentId = charge.payment_intent;
  
  if (paymentIntentId && supabaseClient.isReady()) {
    // Find order by payment intent ID
    const client = supabaseClient.getServiceClient();
    const { data: orders } = await client
      .from('customer_orders')
      .select('id')
      .eq('stripe_payment_intent_id', paymentIntentId);
    
    if (orders && orders.length > 0) {
      const orderId = orders[0].id;
      await supabaseClient.updateOrderStatus(orderId, {
        financial_status: 'refunded',
        order_status: 'Refunded'
      });
    }
  }
}

// Helper function to generate order numbers
async function generateOrderNumber(supabaseClient) {
  try {
    // Get the current year
    const year = new Date().getFullYear();
    
    // Get the count of orders this year
    const { count, error } = await supabaseClient
      .from('orders_main')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', `${year}-01-01`)
      .lt('created_at', `${year + 1}-01-01`);
    
    if (error) {
      console.error('Error getting order count:', error);
      // Fallback to timestamp-based order number
      return `SS-${year}-${Date.now().toString().slice(-6)}`;
    }
    
    // Generate order number: SS-YYYY-NNNNNN
    const orderNumber = `SS-${year}-${String((count || 0) + 1).padStart(6, '0')}`;
    return orderNumber;
  } catch (error) {
    console.error('Error generating order number:', error);
    // Fallback to timestamp-based order number
    const year = new Date().getFullYear();
    return `SS-${year}-${Date.now().toString().slice(-6)}`;
  }
}

module.exports = router; 