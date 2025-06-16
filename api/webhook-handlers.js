const express = require('express');
const supabaseClient = require('./supabase-client');

const router = express.Router();

// Middleware to parse raw body for webhook verification
router.use(express.raw({ type: 'application/json' }));

// Webhook handlers for different Shopify events

// Orders Created - When a new order is placed
router.post('/orders-create', async (req, res) => {
  try {
    // Handle different body formats
    let order;
    try {
      if (typeof req.body === 'string') {
        order = JSON.parse(req.body);
      } else if (Buffer.isBuffer(req.body)) {
        order = JSON.parse(req.body.toString());
      } else {
        order = req.body;
      }
    } catch (parseError) {
      console.error('❌ Failed to parse webhook body:', parseError);
      return res.status(400).send('Invalid JSON');
    }

    console.log('📦 Webhook: Order Created', order?.id, order?.name);

    // Quick response
    res.status(200).send('OK');

    // Process asynchronously
    if (order?.id && supabaseClient.isReady()) {
      setImmediate(async () => {
        try {
          await syncOrderToSupabase(order, 'created');
        } catch (asyncError) {
          console.error('❌ Async order creation processing failed:', asyncError);
        }
      });
    }

  } catch (error) {
    console.error('❌ Critical error in orders/create webhook:', error);
    if (!res.headersSent) {
      res.status(500).send('Webhook processing failed');
    }
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
    console.log('💰 Webhook: Order Paid webhook received');
    console.log('📊 Raw body type:', typeof req.body);
    console.log('📊 Raw body length:', req.body?.length || 'N/A');
    
    // Handle different body formats
    let order;
    try {
      if (typeof req.body === 'string') {
        order = JSON.parse(req.body);
      } else if (Buffer.isBuffer(req.body)) {
        order = JSON.parse(req.body.toString());
      } else {
        order = req.body; // Already parsed
      }
    } catch (parseError) {
      console.error('❌ Failed to parse webhook body:', parseError);
      console.log('Raw body:', req.body?.toString()?.substring(0, 200) + '...');
      return res.status(400).send('Invalid JSON');
    }

    if (!order || !order.id) {
      console.error('❌ Invalid order data received');
      return res.status(400).send('Invalid order data');
    }

    console.log('💰 Processing order payment:', order.id, order.name);

    // Quick response to prevent timeout
    res.status(200).send('OK');

    // Process webhook asynchronously to prevent timeouts
    setImmediate(async () => {
      try {
        if (supabaseClient.isReady()) {
          // Check if this is a cart order (either with metadata or tagged as cart-order)
          const cartMetadata = extractCartMetadata(order.note);
          const isCartOrder = cartMetadata || (order.tags && order.tags.includes('cart-order')) || 
                             (order.note && order.note.includes('🛒 CART ORDER'));
          
          if (isCartOrder) {
            console.log('🛒 Processing cart order payment for:', order.name);
            await updateDraftOrderToRealOrder(order, cartMetadata, order);
          } else {
            console.log('📝 Processing regular order payment for:', order.name);
            await updateOrderStatus(order.id, {
              financial_status: 'paid',
              order_status: 'Creating Proofs'
            });
          }
        } else {
          console.error('❌ Supabase client not ready');
        }
      } catch (asyncError) {
        console.error('❌ Async webhook processing failed:', asyncError);
      }
    });

  } catch (error) {
    console.error('❌ Critical error in orders/paid webhook:', error);
    if (!res.headersSent) {
      res.status(500).send('Webhook processing failed');
    }
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
        const { data: newOrder, error } = await client
          .from('customer_orders')
          .insert([orderData])
          .select()
          .single();

        if (error) {
          console.error('Error inserting order:', error);
        } else {
          console.log('✅ Real order synced to Supabase:', shopifyOrder.name);
          
          // Create order items from Shopify line items
          await createOrderItemsFromShopifyLineItems(newOrder.id, shopifyOrder);
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

// Helper function to update draft order to real order when payment is completed
async function updateDraftOrderToRealOrder(shopifyOrder, cartMetadata, fullShopifyOrder) {
  try {
    console.log('🔄 Updating draft order to real order:', shopifyOrder.name);
    
    const client = supabaseClient.getServiceClient();
    
    // Find the existing draft order by customer email
    const customerEmail = cartMetadata?.customerInfo?.email || shopifyOrder.customer?.email || shopifyOrder.email;
    
    if (!customerEmail) {
      console.error('❌ No customer email found for order update');
      return;
    }

    // Look for recent draft orders for this customer that are awaiting payment
    const { data: existingOrders, error: findError } = await client
      .from('customer_orders')
      .select('*')
      .eq('customer_email', customerEmail)
      .eq('order_status', 'Awaiting Payment')  // Draft orders have this status
      .order('created_at', { ascending: false })
      .limit(1);

    if (findError) {
      console.error('❌ Error finding existing draft order:', findError);
      return;
    }

    if (!existingOrders || existingOrders.length === 0) {
      console.log('⚠️ No draft order found to update for', customerEmail);
      
      // Try to find by order tags if it's a cart order
      if (fullShopifyOrder.tags?.includes('cart-order')) {
        const { data: taggedOrders, error: tagError } = await client
          .from('customer_orders')
          .select('*')
          .eq('customer_email', customerEmail)
          .contains('order_tags', ['cart-order'])
          .eq('order_status', 'Awaiting Payment')
          .order('created_at', { ascending: false })
          .limit(1);

        if (!tagError && taggedOrders && taggedOrders.length > 0) {
          const draftOrder = taggedOrders[0];
          console.log('🔍 Found draft order by tags:', draftOrder.shopify_order_number, '→', shopifyOrder.name);
          await updateExistingDraftOrder(client, draftOrder, shopifyOrder);
          return;
        }
      }
      
      console.log('ℹ️ No existing draft order found - this might be a direct Shopify order');
      return;
    }

    const draftOrder = existingOrders[0];
    console.log('🔍 Found draft order to update:', draftOrder.shopify_order_number, '→', shopifyOrder.name);
    await updateExistingDraftOrder(client, draftOrder, shopifyOrder);

  } catch (error) {
    console.error('❌ Failed to update draft order to real order:', error);
    throw error;
  }
}

// Helper function to update the existing draft order record
async function updateExistingDraftOrder(client, draftOrder, shopifyOrder) {
  // Update the draft order with real order information
  const updateData = {
    shopify_order_id: shopifyOrder.id.toString(),
    shopify_order_number: shopifyOrder.name,
    order_status: 'Creating Proofs',  // Now that payment is confirmed
    financial_status: 'paid',
    fulfillment_status: shopifyOrder.fulfillment_status || 'unfulfilled',
    subtotal_price: parseFloat(shopifyOrder.subtotal_price),
    total_tax: parseFloat(shopifyOrder.total_tax || '0'),
    total_price: parseFloat(shopifyOrder.total_price),
    currency: shopifyOrder.currency,
    shipping_address: shopifyOrder.shipping_address,
    billing_address: shopifyOrder.billing_address,
    order_updated_at: shopifyOrder.updated_at || new Date().toISOString()
  };

  const { error: updateError } = await client
    .from('customer_orders')
    .update(updateData)
    .eq('id', draftOrder.id);

  if (updateError) {
    console.error('❌ Error updating draft order:', updateError);
    return;
  }

  console.log('✅ Draft order updated to real order:', draftOrder.shopify_order_number, '→', shopifyOrder.name);
}

// Helper function to process cart order from webhook (paid orders only) - fallback for new orders
async function processCartOrderFromWebhook(shopifyOrder, cartMetadata) {
  try {
    console.log('🛒 Creating new dashboard order from paid Shopify order:', shopifyOrder.name);
    
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

// Helper function to create order items from Shopify line items
async function createOrderItemsFromShopifyLineItems(customerOrderId, shopifyOrder) {
  try {
    if (!shopifyOrder.line_items || shopifyOrder.line_items.length === 0) {
      console.log('⚠️  No line items found in Shopify order');
      return;
    }

    console.log(`📦 Creating ${shopifyOrder.line_items.length} order items from Shopify line items`);

    const orderItems = shopifyOrder.line_items.map(lineItem => {
      // Extract calculator selections and custom data from properties if available
      let calculatorSelections = {};
      let customFiles = [];
      let customerNotes = '';
      let instagramHandle = '';
      let instagramOptIn = false;

      // Process line item properties (custom fields from calculator)
      if (lineItem.properties && Array.isArray(lineItem.properties)) {
        lineItem.properties.forEach(prop => {
          const key = prop.name?.toLowerCase();
          
          if (key === 'calculator_selections' || key === 'selections') {
            try {
              calculatorSelections = JSON.parse(prop.value);
            } catch (e) {
              calculatorSelections[prop.name] = prop.value;
            }
          } else if (key === 'custom_files' || key === 'files') {
            try {
              customFiles = JSON.parse(prop.value);
            } catch (e) {
              customFiles = prop.value ? [prop.value] : [];
            }
          } else if (key === 'customer_notes' || key === 'notes' || key === 'special_instructions') {
            customerNotes = prop.value || '';
          } else if (key === 'instagram_handle' || key === 'instagram') {
            instagramHandle = prop.value || '';
          } else if (key === 'instagram_opt_in' || key === 'share_on_instagram') {
            instagramOptIn = prop.value === 'true' || prop.value === true;
          } else {
            // Store other properties in calculator selections
            calculatorSelections[prop.name] = prop.value;
          }
        });
      }

      // Extract additional data from order note if no properties found
      if (Object.keys(calculatorSelections).length === 0 && shopifyOrder.note) {
        try {
          // Try to extract calculator data from note
          const noteData = extractCalculatorDataFromNote(shopifyOrder.note, lineItem.sku);
          if (noteData) {
            calculatorSelections = noteData.selections || {};
            customFiles = noteData.files || [];
            customerNotes = noteData.notes || '';
          }
        } catch (e) {
          console.log('Note parsing failed:', e.message);
        }
      }

      return {
        customer_order_id: customerOrderId,
        product_id: lineItem.product_id?.toString() || lineItem.sku || 'unknown',
        product_name: lineItem.title,
        product_category: lineItem.product_type || 'Stickers',
        sku: lineItem.sku,
        quantity: lineItem.quantity,
        unit_price: parseFloat(lineItem.price),
        total_price: parseFloat(lineItem.price) * lineItem.quantity,
        calculator_selections: Object.keys(calculatorSelections).length > 0 ? calculatorSelections : {},
        custom_files: customFiles.length > 0 ? customFiles : [],
        customer_notes: customerNotes || null,
        instagram_handle: instagramHandle || null,
        instagram_opt_in: instagramOptIn,
        fulfillment_status: 'unfulfilled'
      };
    });

    await supabaseClient.createOrderItems(orderItems);
    console.log(`✅ Created ${orderItems.length} order items from Shopify line items`);

  } catch (error) {
    console.error('❌ Failed to create order items from Shopify line items:', error);
  }
}

// Helper function to extract calculator data from order note for specific SKU
function extractCalculatorDataFromNote(note, sku) {
  try {
    // Look for calculator data patterns in the note
    const patterns = [
      /Calculator Selections:(.*?)(?=\n[A-Z]|$)/s,
      /Selections:(.*?)(?=\n[A-Z]|$)/s,
      new RegExp(`SKU: ${sku}[\\s\\S]*?Selections:(.*?)(?=\\nSKU:|$)`, 's')
    ];

    for (const pattern of patterns) {
      const match = note.match(pattern);
      if (match) {
        const selectionsText = match[1].trim();
        // Parse simple key: value pairs
        const selections = {};
        selectionsText.split('\n').forEach(line => {
          const [key, ...valueParts] = line.split(':');
          if (key && valueParts.length > 0) {
            selections[key.trim()] = valueParts.join(':').trim();
          }
        });
        return { selections };
      }
    }
  } catch (e) {
    console.log('Failed to parse calculator data from note:', e.message);
  }
  return null;
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