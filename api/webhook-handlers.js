const express = require('express');
const supabaseClient = require('./supabase-client');

const router = express.Router();

// Middleware to parse raw body for webhook verification
router.use(express.raw({ type: 'application/json' }));

// Webhook handlers for different Shopify events

// Orders Created - When a new order is placed
router.post('/orders-create', async (req, res) => {
  try {
    const order = JSON.parse(req.body);
    console.log('📦 Webhook: Order Created', order.id, order.name);

    if (supabaseClient.isReady()) {
      await syncOrderToSupabase(order, 'created');
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing orders/create webhook:', error);
    res.status(500).send('Error processing webhook');
  }
});

// Orders Updated - When order details change
router.post('/orders-updated', async (req, res) => {
  try {
    const order = JSON.parse(req.body);
    console.log('📝 Webhook: Order Updated', order.id, order.name);

    if (supabaseClient.isReady()) {
      await syncOrderToSupabase(order, 'updated');
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing orders/updated webhook:', error);
    res.status(500).send('Error processing webhook');
  }
});

// Orders Paid - When payment is completed
router.post('/orders-paid', async (req, res) => {
  try {
    const order = JSON.parse(req.body);
    console.log('💰 Webhook: Order Paid', order.id, order.name);

    if (supabaseClient.isReady()) {
      // First check if this is a cart order with metadata
      const cartMetadata = extractCartMetadata(order.note);
      
      if (cartMetadata) {
        console.log('🛒 Processing cart order with metadata for:', order.name);
        await processCartOrderFromWebhook(order, cartMetadata);
      } else {
        // Regular order status update for non-cart orders
        await updateOrderStatus(order.id, {
          financial_status: 'paid',
          order_status: 'Creating Proofs'
        });
      }
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing orders/paid webhook:', error);
    res.status(500).send('Error processing webhook');
  }
});

// Orders Cancelled - When order is cancelled
router.post('/orders-cancelled', async (req, res) => {
  try {
    const order = JSON.parse(req.body);
    console.log('❌ Webhook: Order Cancelled', order.id, order.name);

    if (supabaseClient.isReady()) {
      await updateOrderStatus(order.id, {
        order_status: 'cancelled',
        financial_status: order.financial_status
      });
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing orders/cancelled webhook:', error);
    res.status(500).send('Error processing webhook');
  }
});

// Orders Fulfilled - When order is shipped
router.post('/orders-fulfilled', async (req, res) => {
  try {
    const order = JSON.parse(req.body);
    console.log('🚚 Webhook: Order Fulfilled', order.id, order.name);

    if (supabaseClient.isReady()) {
      // Extract tracking information if available
      const fulfillment = order.fulfillments?.[0];
      const trackingInfo = fulfillment ? {
        fulfillment_status: 'fulfilled',
        tracking_number: fulfillment.tracking_number,
        tracking_company: fulfillment.tracking_company,
        tracking_url: fulfillment.tracking_urls?.[0]
      } : { fulfillment_status: 'fulfilled' };

      await updateOrderStatus(order.id, trackingInfo);
    }

    res.status(200).send('OK');
  } catch (error) {
    console.error('Error processing orders/fulfilled webhook:', error);
    res.status(500).send('Error processing webhook');
  }
});

// Helper function to sync order data to Supabase
async function syncOrderToSupabase(shopifyOrder, eventType) {
  try {
    const client = supabaseClient.getServiceClient();
    
    const orderData = {
      shopify_order_id: shopifyOrder.id.toString(),
      shopify_order_number: shopifyOrder.name,
      order_status: mapShopifyStatus(shopifyOrder.fulfillment_status, shopifyOrder.financial_status),
      fulfillment_status: shopifyOrder.fulfillment_status || 'unfulfilled',
      financial_status: shopifyOrder.financial_status || 'pending',
      subtotal_price: parseFloat(shopifyOrder.subtotal_price),
      total_tax: parseFloat(shopifyOrder.total_tax || '0'),
      total_price: parseFloat(shopifyOrder.total_price),
      currency: shopifyOrder.currency,
      customer_first_name: shopifyOrder.customer?.first_name,
      customer_last_name: shopifyOrder.customer?.last_name,
      customer_email: shopifyOrder.customer?.email || shopifyOrder.email,
      customer_phone: shopifyOrder.customer?.phone,
      shipping_address: shopifyOrder.shipping_address,
      billing_address: shopifyOrder.billing_address,
      order_tags: shopifyOrder.tags ? shopifyOrder.tags.split(', ') : [],
      order_note: shopifyOrder.note,
      order_created_at: shopifyOrder.created_at,
      order_updated_at: shopifyOrder.updated_at
    };

    if (eventType === 'created') {
      // IMPORTANT: Only sync real orders (not draft orders)
      // Draft orders have names like "#D28", real orders have names like "#1001"
      if (shopifyOrder.name && shopifyOrder.name.startsWith('#D')) {
        console.log(`⏭️ Skipping draft order: ${shopifyOrder.name} - Draft orders are not tracked in dashboard`);
        return;
      }

      // Check if order already exists (in case of duplicate webhooks)
      const { data: existingOrder } = await client
        .from('customer_orders')
        .select('id')
        .eq('shopify_order_id', shopifyOrder.id.toString())
        .single();

      if (!existingOrder) {
        const { error } = await client
          .from('customer_orders')
          .insert([orderData]);

        if (error) {
          console.error('Error inserting order:', error);
        } else {
          console.log('✅ Real order synced to Supabase:', shopifyOrder.name);
        }
      }
    } else {
      // Update existing order
      const { error } = await client
        .from('customer_orders')
        .update(orderData)
        .eq('shopify_order_id', shopifyOrder.id.toString());

      if (error) {
        console.error('Error updating order:', error);
      } else {
        console.log('✅ Order updated in Supabase:', shopifyOrder.name);
      }
    }
  } catch (error) {
    console.error('Error syncing order to Supabase:', error);
    throw error;
  }
}

// Helper function to update order status
async function updateOrderStatus(shopifyOrderId, statusUpdate) {
  try {
    const client = supabaseClient.getServiceClient();
    
    const { error } = await client
      .from('customer_orders')
      .update({
        ...statusUpdate,
        updated_at: new Date().toISOString()
      })
      .eq('shopify_order_id', shopifyOrderId.toString());

    if (error) {
      console.error('Error updating order status:', error);
    } else {
      console.log('✅ Order status updated:', shopifyOrderId);
    }
  } catch (error) {
    console.error('Error updating order status:', error);
    throw error;
  }
}

// Helper function to extract cart metadata from order note
function extractCartMetadata(orderNote) {
  if (!orderNote) return null;
  
  try {
    const metadataStart = orderNote.indexOf('--- CART_METADATA ---');
    if (metadataStart === -1) return null;
    
    const metadataJson = orderNote.substring(metadataStart + '--- CART_METADATA ---'.length).trim();
    return JSON.parse(metadataJson);
  } catch (error) {
    console.error('❌ Failed to extract cart metadata:', error);
    return null;
  }
}

// Helper function to process cart order from webhook (paid orders only)
async function processCartOrderFromWebhook(shopifyOrder, cartMetadata) {
  try {
    console.log('🛒 Creating dashboard order from paid Shopify order:', shopifyOrder.name);
    
    const client = supabaseClient.getServiceClient();
    
    // Create customer order record with paid status
    const customerOrderData = {
      user_id: cartMetadata.userId || null,
      guest_email: cartMetadata.guestEmail || cartMetadata.customerInfo.email,
      shopify_order_id: shopifyOrder.id.toString(),
      shopify_order_number: shopifyOrder.name,
      order_status: 'Creating Proofs',  // Start workflow now that payment is confirmed
      fulfillment_status: 'unfulfilled',
      financial_status: 'paid',  // Payment is confirmed
      subtotal_price: parseFloat(shopifyOrder.subtotal_price),
      total_tax: parseFloat(shopifyOrder.total_tax || '0'),
      total_price: parseFloat(shopifyOrder.total_price),
      currency: shopifyOrder.currency,
      customer_first_name: cartMetadata.customerInfo.firstName,
      customer_last_name: cartMetadata.customerInfo.lastName,
      customer_email: cartMetadata.customerInfo.email,
      customer_phone: cartMetadata.customerInfo.phone,
      shipping_address: cartMetadata.shippingAddress,
      billing_address: cartMetadata.billingAddress || cartMetadata.shippingAddress,
      order_tags: ['cart-order', 'paid', 'webhook-processed'],
      order_note: cartMetadata.orderNote,
      order_created_at: shopifyOrder.created_at,
      order_updated_at: shopifyOrder.updated_at
    };

    // Create customer order with duplicate prevention
    const customerOrder = await supabaseClient.createCustomerOrder(customerOrderData);
    
    if (customerOrder) {
      console.log('✅ Customer order created from webhook:', customerOrder.id);

      // Create order items with calculator data
      const orderItems = cartMetadata.cartItems.map(item => ({
        customer_order_id: customerOrder.id,
        product_id: item.productId,
        product_name: item.productName,
        product_category: item.productCategory,
        sku: item.sku,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        calculator_selections: item.calculatorSelections,
        custom_files: item.customFiles || [],
        customer_notes: item.customerNotes,
        instagram_handle: item.instagramHandle,
        instagram_opt_in: item.instagramOptIn || false,
        fulfillment_status: 'unfulfilled'
      }));

      await supabaseClient.createOrderItems(orderItems);
      console.log('✅ Order items created from webhook');
    }

  } catch (error) {
    console.error('❌ Failed to process cart order from webhook:', error);
    throw error;
  }
}

// Helper function to map Shopify statuses to our internal status
function mapShopifyStatus(fulfillmentStatus, financialStatus) {
  if (financialStatus === 'paid' && fulfillmentStatus === 'fulfilled') {
    return 'completed';
  } else if (financialStatus === 'paid') {
    return 'processing';
  } else if (financialStatus === 'pending') {
    return 'pending';
  } else if (financialStatus === 'refunded') {
    return 'refunded';
  } else {
    return 'pending';
  }
}

module.exports = router; 