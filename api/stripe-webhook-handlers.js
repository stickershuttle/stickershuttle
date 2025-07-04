const express = require('express');
const stripeClient = require('./stripe-client');
const supabaseClient = require('./supabase-client');
const notificationHelpers = require('./notification-helpers');
const { discountManager } = require('./discount-manager');
const { createGuestAccount, emailExists } = require('./guest-account-manager');
const serverAnalytics = require('./business-analytics');

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

// Test endpoint for Discord notifications (disabled)
router.post('/test-discord-notification/:orderId', async (req, res) => {
  try {
    console.log('🧪 Test endpoint: Discord notifications disabled');
    
    res.json({ 
      success: true, 
      message: 'Discord notifications are currently disabled',
      orderId: req.params.orderId
    });
  } catch (error) {
    console.error('Test endpoint error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Test endpoint to manually process a checkout session
router.post('/test-process-session/:sessionId', async (req, res) => {
  try {
    console.log('🧪 Test endpoint: Processing session', req.params.sessionId);
    
    if (!stripeClient.isReady()) {
      return res.status(500).json({ error: 'Stripe not configured' });
    }

    // Fetch the session from Stripe
    const session = await stripeClient.getCheckoutSession(req.params.sessionId);
    
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Manually trigger the webhook handler
    await handleCheckoutSessionCompleted(session);
    
    res.json({ 
      success: true, 
      message: 'Session processed',
      sessionId: session.id,
      paymentStatus: session.payment_status,
      customerOrderId: session.metadata?.customerOrderId
    });
  } catch (error) {
    console.error('Test processing error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Handle successful checkout session
async function handleCheckoutSessionCompleted(session) {
  console.log('💳 Processing checkout session completed:', session.id);
  
  try {
    // Log the original webhook session data first
    console.log('🔍 Original webhook session data:', {
      id: session.id,
      shipping_cost: session.shipping_cost,
      shipping_details: session.shipping_details,
      amount_total: session.amount_total,
      payment_status: session.payment_status
    });
    
    // Get full session details to access metadata and line items
    const stripe = require('./stripe-client');
    let fullSession = await stripe.getCheckoutSession(session.id);
    
    // If shipping cost is not available, wait a moment and try again
    // Sometimes Stripe needs a moment to populate all session data
    if (!fullSession.shipping_cost && !session.shipping_cost) {
      console.log('⏳ Shipping cost not found, waiting 2 seconds and retrying...');
      await new Promise(resolve => setTimeout(resolve, 2000));
      fullSession = await stripe.getCheckoutSession(session.id);
    }
    
    const metadata = fullSession.metadata || {};
    const cartMetadata = fullSession.metadata?.cartData ? JSON.parse(fullSession.metadata.cartData) : {};
    
    console.log('📋 Full session metadata:', metadata);
    console.log('🛒 Cart metadata:', cartMetadata);
    
    // Get customer info and shipping address
    const customer = fullSession.customer_details || {};
    const shippingAddress = fullSession.shipping_details?.address || fullSession.customer_details?.address || {};
    
    // Enhanced shipping method detection with multiple strategies
    console.log('🚚 === COMPREHENSIVE SHIPPING DEBUG START ===');
    
    // Strategy 1: Try to get shipping option from both sessions
    let shippingOption = fullSession.shipping_cost?.shipping_rate || session.shipping_cost?.shipping_rate || null;
    
    console.log('🔍 Strategy 1 - Direct shipping rate access:', {
      fullSession_shipping_cost: fullSession.shipping_cost,
      fullSession_shipping_rate: fullSession.shipping_cost?.shipping_rate,
      fullSession_display_name: fullSession.shipping_cost?.shipping_rate?.display_name,
      original_session_shipping_cost: session.shipping_cost,
      original_session_shipping_rate: session.shipping_cost?.shipping_rate,
      original_session_display_name: session.shipping_cost?.shipping_rate?.display_name,
      selected_shipping_option: shippingOption
    });
    
    // Strategy 2: Check if shipping cost has amount_total for fallback detection
    const shippingCostAmount = fullSession.shipping_cost?.amount_total || session.shipping_cost?.amount_total || 0;
    console.log('🔍 Strategy 2 - Shipping cost amount:', shippingCostAmount);
    
    // Strategy 3: Try to access shipping rate data directly from the session object
    console.log('🔍 Strategy 3 - Full session shipping exploration:');
    console.log('  - fullSession.shipping_cost keys:', fullSession.shipping_cost ? Object.keys(fullSession.shipping_cost) : 'null');
    console.log('  - original session.shipping_cost keys:', session.shipping_cost ? Object.keys(session.shipping_cost) : 'null');
    
    // Strategy 4: Check if we can find shipping rate in expanded line items or other session data
    if (fullSession.shipping_cost?.shipping_rate) {
      console.log('🔍 Strategy 4 - Expanded shipping rate object:', JSON.stringify(fullSession.shipping_cost.shipping_rate, null, 2));
    }
    
    // Strategy 4.5: Check all session properties for any shipping-related data
    console.log('🔍 Strategy 4.5 - Session property exploration:');
    const sessionKeys = Object.keys(fullSession);
    const shippingRelatedKeys = sessionKeys.filter(key => 
      key.toLowerCase().includes('ship') || 
      key.toLowerCase().includes('delivery') ||
      key.toLowerCase().includes('rate')
    );
    console.log('  - Shipping-related keys in session:', shippingRelatedKeys);
    shippingRelatedKeys.forEach(key => {
      console.log(`  - ${key}:`, fullSession[key]);
    });
    
    // Strategy 5: Manual session re-retrieval with different expansion
    try {
      console.log('🔍 Strategy 5 - Manual session retrieval with comprehensive expansion...');
      const stripeInstance = stripe.stripe; // Access the raw Stripe instance
      const manualSession = await stripeInstance.checkout.sessions.retrieve(session.id, {
        expand: [
          'line_items.data.price.product', 
          'customer', 
          'payment_intent', 
          'shipping_cost.shipping_rate',
          'shipping_cost',
          'shipping_details'
        ]
      });
      
      console.log('  - Manual session shipping_cost:', manualSession.shipping_cost);
      console.log('  - Manual session shipping_rate:', manualSession.shipping_cost?.shipping_rate);
      console.log('  - Manual session display_name:', manualSession.shipping_cost?.shipping_rate?.display_name);
      
      // Use manual session data if available
      if (manualSession.shipping_cost?.shipping_rate && !shippingOption) {
        shippingOption = manualSession.shipping_cost.shipping_rate;
        console.log('✅ Using shipping rate from manual session retrieval');
      }
    } catch (manualError) {
      console.log('⚠️ Manual session retrieval failed:', manualError.message);
    }
    
    // Strategy 6: Check total_details for shipping breakdown
    if (fullSession.total_details) {
      console.log('🔍 Strategy 6 - Total details exploration:', {
        total_details: fullSession.total_details,
        breakdown: fullSession.total_details.breakdown
      });
    }
    
    // Strategy 7: Last resort - check if shipping method is in any metadata
    console.log('🔍 Strategy 7 - Metadata shipping search:');
    const metadataKeys = Object.keys(metadata);
    const shippingMetadataKeys = metadataKeys.filter(key => 
      key.toLowerCase().includes('ship') || 
      key.toLowerCase().includes('delivery')
    );
    console.log('  - Shipping-related metadata keys:', shippingMetadataKeys);
    shippingMetadataKeys.forEach(key => {
      console.log(`  - ${key}:`, metadata[key]);
    });
    
    console.log('🚚 === COMPREHENSIVE SHIPPING DEBUG END ===');
    
    // Determine if this is express shipping
    let isExpressShipping = false;
    let shippingMethodName = 'UPS Ground';
    
    if (shippingOption && shippingOption.display_name) {
      shippingMethodName = shippingOption.display_name;
      isExpressShipping = shippingMethodName.includes('Next Day Air') || shippingMethodName.includes('2nd Day Air');
      console.log('✅ Shipping method captured from display_name:', shippingMethodName, 'Express:', isExpressShipping);
    } else {
      console.log('⚠️ No shipping option found, attempting amount-based detection...');
      
      // Enhanced amount-based detection with more logging
      console.log('💰 Amount-based detection details:', {
        shippingCostAmount,
        amountInDollars: shippingCostAmount / 100,
        detectionLogic: {
          '$40 (4000 cents)': 'UPS Next Day Air',
          '$20 (2000 cents)': 'UPS 2nd Day Air', 
          '$0 (0 cents)': 'UPS Ground'
        }
      });
      
      if (shippingCostAmount === 4000) { // $40.00 in cents
        shippingMethodName = 'UPS Next Day Air';
        isExpressShipping = true;
        console.log('🔍 Detected UPS Next Day Air from $40 shipping cost');
      } else if (shippingCostAmount === 2000) { // $20.00 in cents
        shippingMethodName = 'UPS 2nd Day Air';
        isExpressShipping = true;
        console.log('🔍 Detected UPS 2nd Day Air from $20 shipping cost');
      } else if (shippingCostAmount === 0) {
        shippingMethodName = 'UPS Ground';
        isExpressShipping = false;
        console.log('🔍 Detected UPS Ground from $0 shipping cost');
      } else {
        console.log('⚠️ Unknown shipping cost amount:', shippingCostAmount, 'cents, using default UPS Ground');
        shippingMethodName = `UPS Ground (Unknown cost: $${(shippingCostAmount / 100).toFixed(2)})`;
      }
    }
    
    // Add development debug display
    if (process.env.NODE_ENV === 'development') {
      console.log('🛠️ DEVELOPMENT DEBUG - Raw shipping data:');
      console.log('  - Final shipping method:', shippingMethodName);
      console.log('  - Is express:', isExpressShipping);
      console.log('  - Shipping cost amount:', shippingCostAmount);
      console.log('  - Shipping option object:', shippingOption);
    }
    
    // Check for rush orders in line items
    let isRushOrder = false;
    if (fullSession.line_items?.data) {
      for (const lineItem of fullSession.line_items.data) {
        const itemMetadata = lineItem.price.product.metadata || {};
        
        // Parse calculator selections to check for rush order
        let calculatorSelections = {};
        
        // Try to rebuild from metadata and order note
        if (metadata.orderNote) {
          const orderNoteSelections = parseCalculatorSelectionsFromOrderNote(metadata.orderNote);
          calculatorSelections = { ...calculatorSelections, ...orderNoteSelections };
        }
        
        // Check for rush order
        if (calculatorSelections.rush && calculatorSelections.rush.value === true) {
          isRushOrder = true;
          break;
        }
      }
    }
    
    console.log('🚚 Final shipping details:', {
      shippingMethodName,
      isExpressShipping,
      shippingCost: shippingCostAmount,
      detectionMethod: shippingOption ? 'display_name' : 'amount_based'
    });
    
    console.log('🚀 Rush order details:', {
      isRushOrder
    });
    
    // Handle guest checkout - just store the email, no account creation
    console.log('🔍 Checking for guest checkout - userId:', metadata.userId, 'customer email:', customer.email);
    
    if (metadata.userId === 'guest' && customer.email) {
      console.log('👤 Processing guest checkout for:', customer.email);
      // Guest email will be stored with the order, no account creation needed
    } else {
      console.log('📋 Not a guest checkout - userId:', metadata.userId);
    }
    
    // Look for existing order by Stripe session ID
    let existingOrderId = null;
    
    if (supabaseClient.isReady()) {
      const client = supabaseClient.getServiceClient();
      
      console.log('🔍 Searching for existing order with session ID:', session.id);
      const { data: existingOrders, error } = await client
        .from('orders_main')
        .select('id, order_status, user_id, guest_email, created_at')
        .eq('stripe_session_id', session.id)
        .limit(1);
      
      if (error) {
        console.error('❌ Error checking for existing orders:', error);
      } else if (existingOrders && existingOrders.length > 0) {
        existingOrderId = existingOrders[0].id;
        console.log('📝 Found existing order:', {
          orderId: existingOrderId,
          currentStatus: existingOrders[0].order_status,
          userId: existingOrders[0].user_id,
          guestEmail: existingOrders[0].guest_email,
          createdAt: existingOrders[0].created_at
        });
      } else {
        console.log('⚠️ No existing order found with session ID:', session.id);
        console.log('🔍 This might indicate a session ID update failed during checkout');
        
        // Let's also check for orders without session IDs that might match this user/email
        if (metadata.userId && metadata.userId !== 'guest') {
          const { data: userOrders } = await client
            .from('orders_main')
            .select('id, order_status, stripe_session_id, created_at')
            .eq('user_id', metadata.userId)
            .eq('order_status', 'Awaiting Payment')
            .order('created_at', { ascending: false })
            .limit(5);
          
          console.log('🔍 Recent "Awaiting Payment" orders for user:', userOrders);
        } else if (customer.email) {
          const { data: guestOrders } = await client
            .from('orders_main')
            .select('id, order_status, stripe_session_id, created_at')
            .eq('guest_email', customer.email)
            .eq('order_status', 'Awaiting Payment')
            .order('created_at', { ascending: false })
            .limit(5);
          
          console.log('🔍 Recent "Awaiting Payment" orders for guest email:', guestOrders);
        }
      }
    }
    
    // If no existing order found by session ID, try to find a stuck "Awaiting Payment" order
    if (!existingOrderId) {
      console.log('🔄 Attempting to recover stuck "Awaiting Payment" order...');
      
      const client = supabaseClient.getServiceClient();
      let recoveredOrder = null;
      
      // Try to find a recent "Awaiting Payment" order for this user/email
      if (metadata.userId && metadata.userId !== 'guest') {
        const { data: userOrders } = await client
          .from('orders_main')
          .select('id, created_at, total_price, customer_email')
          .eq('user_id', metadata.userId)
          .eq('order_status', 'Awaiting Payment')
          .is('stripe_session_id', null) // No session ID assigned yet
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (userOrders && userOrders.length > 0) {
          const order = userOrders[0];
          const orderAge = Date.now() - new Date(order.created_at).getTime();
          const orderTotal = parseFloat(order.total_price);
          const sessionTotal = fullSession.amount_total / 100;
          
          // Only recover if order is recent (less than 1 hour old) and total matches
          if (orderAge < 3600000 && Math.abs(orderTotal - sessionTotal) < 0.01) {
            console.log('✅ Found matching stuck order for user:', {
              orderId: order.id,
              orderTotal,
              sessionTotal,
              ageMinutes: Math.round(orderAge / 60000)
            });
            recoveredOrder = order;
          }
        }
      } else if (customer.email) {
        const { data: guestOrders } = await client
          .from('orders_main')
          .select('id, created_at, total_price, customer_email')
          .eq('guest_email', customer.email)
          .eq('order_status', 'Awaiting Payment')
          .is('stripe_session_id', null) // No session ID assigned yet
          .order('created_at', { ascending: false })
          .limit(1);
        
        if (guestOrders && guestOrders.length > 0) {
          const order = guestOrders[0];
          const orderAge = Date.now() - new Date(order.created_at).getTime();
          const orderTotal = parseFloat(order.total_price);
          const sessionTotal = fullSession.amount_total / 100;
          
          // Only recover if order is recent (less than 1 hour old) and total matches
          if (orderAge < 3600000 && Math.abs(orderTotal - sessionTotal) < 0.01) {
            console.log('✅ Found matching stuck order for guest:', {
              orderId: order.id,
              orderTotal,
              sessionTotal,
              ageMinutes: Math.round(orderAge / 60000)
            });
            recoveredOrder = order;
          }
        }
      }
      
      if (recoveredOrder) {
        existingOrderId = recoveredOrder.id;
        console.log('🔄 Recovered stuck order - updating with session ID:', session.id);
        
        // Update the recovered order with the session ID before proceeding
        await client
          .from('orders_main')
          .update({ 
            stripe_session_id: session.id,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingOrderId);
      }
    }

    if (existingOrderId) {
      // Update existing order with payment info
      console.log('📝 Updating existing order with payment info...');
      
      const client = supabaseClient.getServiceClient();
      
      // Check if this is a reorder by looking at line items metadata
      const isReorder = fullSession.line_items?.data?.some(lineItem => {
        const itemMetadata = lineItem.price.product.metadata || {};
        return itemMetadata.isReorder === 'true';
      }) || false;
      
      // Determine order status based on proof selections
      let orderStatus = 'Building Proof'; // Default status
      let proofStatus = null; // Database proof_status field
      
      if (isReorder) {
        orderStatus = 'Printing';
        proofStatus = 'approved';
      } else {
        // Check proof selections from line items
        let hasNoProofItems = false;
        let hasProofItems = false;
        
        if (fullSession.line_items?.data) {
          for (const lineItem of fullSession.line_items.data) {
            const itemMetadata = lineItem.price.product.metadata || {};
            
            // Parse calculator selections to check proof preference
            let calculatorSelections = {};
            
            // First, try to rebuild from simplified metadata fields
            if (itemMetadata.size || itemMetadata.material || itemMetadata.cut) {
              if (itemMetadata.size) {
                calculatorSelections.size = {
                  type: 'size-preset',
                  value: itemMetadata.size,
                  displayValue: itemMetadata.size,
                  priceImpact: 0
                };
              }
              if (itemMetadata.material) {
                calculatorSelections.material = {
                  type: 'finish',
                  value: itemMetadata.material,
                  displayValue: itemMetadata.material,
                  priceImpact: 0
                };
              }
              if (itemMetadata.cut) {
                calculatorSelections.cut = {
                  type: 'shape',
                  value: itemMetadata.cut,
                  displayValue: itemMetadata.cut,
                  priceImpact: 0
                };
              }
            }
            
            // Parse from orderNote for additional fields including proof selection
            if (metadata.orderNote) {
              const orderNoteSelections = parseCalculatorSelectionsFromOrderNote(metadata.orderNote);
              calculatorSelections = { ...calculatorSelections, ...orderNoteSelections };
            }
            
            // Check proof selection
            if (calculatorSelections.proof) {
              if (calculatorSelections.proof.value === false || calculatorSelections.proof.displayValue === 'No Proof') {
                hasNoProofItems = true;
              } else {
                hasProofItems = true;
              }
            } else {
              // Default to requiring proof if not specified
              hasProofItems = true;
            }
          }
        }
        
        // Set status based on proof selections
        if (hasNoProofItems && !hasProofItems) {
          // All items don't need proofs - go directly to printing
          orderStatus = 'Printing';
          proofStatus = 'approved';
          console.log('🚀 All items selected "Don\'t Send Proof" - setting order to Printing status');
        } else if (hasNoProofItems && hasProofItems) {
          // Mixed - some need proofs, some don't - default to building proof for safety
          orderStatus = 'Building Proof';
          proofStatus = null; // Will be set when proofs are sent
          console.log('📋 Mixed proof preferences - defaulting to Building Proof status');
        } else {
          // All items need proofs or default behavior
          orderStatus = 'Building Proof';
          proofStatus = null; // Will be set when proofs are sent
          console.log('📋 Proof requested - setting order to Building Proof status');
        }
      }
      
      // Generate order number (e.g., SS-2024-001234)
      const orderNumber = await generateOrderNumber(client);
      
      const updateData = {
        stripe_payment_intent_id: fullSession.payment_intent,
        stripe_session_id: session.id,
        order_status: orderStatus,
        financial_status: 'paid',
        order_number: orderNumber,
        subtotal_price: (fullSession.amount_subtotal / 100).toFixed(2),
        total_tax: ((fullSession.amount_total - fullSession.amount_subtotal) / 100).toFixed(2),
        total_price: (fullSession.amount_total / 100).toFixed(2),
        // Add customer information from Stripe
        customer_first_name: customer.name?.split(' ')[0] || '',
        customer_last_name: customer.name?.split(' ').slice(1).join(' ') || '',
        customer_email: customer.email,
        customer_phone: customer.phone,
        // Update shipping address from Stripe if provided
        shipping_address: {
          line1: shippingAddress.line1,
          line2: shippingAddress.line2,
          city: shippingAddress.city,
          state: shippingAddress.state,
          postal_code: shippingAddress.postal_code,
          country: shippingAddress.country,
        },
        shipping_method: shippingMethodName,
        is_express_shipping: isExpressShipping,
        is_rush_order: isRushOrder,
        order_updated_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      // Add proof_status if determined
      if (proofStatus) {
        updateData.proof_status = proofStatus;
      }
      
      let updatedOrder;
      
      // Use database transaction for order updates to ensure data integrity
      console.log('📝 Starting transaction to update order with ID:', existingOrderId);
      
      try {
        // Start transaction context for order update
        const { data: transactionResult, error: transactionError } = await client.rpc('run_order_update_transaction', {
          p_order_id: existingOrderId,
          p_payment_intent_id: fullSession.payment_intent,
          p_session_id: session.id,
          p_order_status: orderStatus,
          p_financial_status: 'paid',
          p_order_number: orderNumber,
          p_subtotal: parseFloat((fullSession.amount_subtotal / 100).toFixed(2)),
          p_tax: parseFloat(((fullSession.amount_total - fullSession.amount_subtotal) / 100).toFixed(2)),
          p_total: parseFloat((fullSession.amount_total / 100).toFixed(2)),
          p_proof_status: proofStatus || null,
          p_shipping_address: JSON.stringify(updateData.shipping_address),
          p_customer_data: JSON.stringify({
            first_name: customer.name?.split(' ')[0] || '',
            last_name: customer.name?.split(' ').slice(1).join(' ') || '',
            email: customer.email,
            phone: customer.phone
          })
        });
        
        if (!transactionError && transactionResult) {
          console.log('✅ Order updated successfully in transaction');
          updatedOrder = transactionResult;
          
          // Update shipping method fields separately since RPC functions don't include them
          console.log('📦 Updating shipping method fields separately:', {
            shipping_method: shippingMethodName,
            is_express_shipping: isExpressShipping,
            is_rush_order: isRushOrder
          });
          
          await client
            .from('orders_main')
            .update({ 
              shipping_method: shippingMethodName,
              is_express_shipping: isExpressShipping,
              is_rush_order: isRushOrder,
              shipping_address: updateData.shipping_address
            })
            .eq('id', existingOrderId);
        } else {
          console.log('⚠️ Transaction function not available, falling back to individual operations...');
          
          // Fallback: Manual transaction using individual queries
          // First, try the RPC function that bypasses RLS
          const { data: rpcData, error: rpcError } = await client.rpc('update_order_payment_status', {
            p_order_id: existingOrderId,
            p_payment_intent_id: fullSession.payment_intent,
            p_session_id: session.id,
            p_order_status: orderStatus,
            p_financial_status: 'paid',
            p_order_number: orderNumber,
            p_subtotal: parseFloat((fullSession.amount_subtotal / 100).toFixed(2)),
            p_tax: parseFloat(((fullSession.amount_total - fullSession.amount_subtotal) / 100).toFixed(2)),
            p_total: parseFloat((fullSession.amount_total / 100).toFixed(2)),
            p_proof_status: proofStatus || null
          });
          
          if (!rpcError && rpcData && rpcData.length > 0) {
            console.log('✅ Order updated successfully using RPC function');
            updatedOrder = rpcData[0];
            
            // Update shipping address separately if needed
            await client
              .from('orders_main')
              .update({ shipping_address: updateData.shipping_address })
              .eq('id', existingOrderId);
              
            // Update shipping method fields separately since RPC functions don't include them
            console.log('📦 Updating shipping method fields separately:', {
              shipping_method: shippingMethodName,
              is_express_shipping: isExpressShipping,
              is_rush_order: isRushOrder
            });
            
            await client
              .from('orders_main')
              .update({ 
                shipping_method: shippingMethodName,
                is_express_shipping: isExpressShipping,
                is_rush_order: isRushOrder
              })
              .eq('id', existingOrderId);
          } else {
            // Final fallback to standard update if RPC function doesn't exist or fails
            console.log('⚠️ RPC function not available or failed, trying standard update...');
            if (rpcError) {
              console.log('RPC error:', rpcError.message);
            }
            
            const { data, error: updateError } = await client
              .from('orders_main')
              .update(updateData)
              .eq('id', existingOrderId)
              .select()
              .single();
            
            if (updateError) {
              console.error('❌ Error updating order:', updateError);
              console.error('❌ Error code:', updateError.code);
              console.error('❌ Error details:', updateError.details);
              console.error('❌ Error hint:', updateError.hint);
              console.error('❌ Error message:', updateError.message);
              throw updateError;
            }
            
            updatedOrder = data;
          }
        }
      } catch (error) {
        console.error('❌ Failed to update order in transaction:', error);
        throw error;
      }
      
      console.log('✅ Order updated successfully:', updatedOrder?.id);
      console.log('🔍 Order status after update:', {
        orderId: updatedOrder?.id,
        orderStatus: updatedOrder?.order_status,
        financialStatus: updatedOrder?.financial_status,
        orderNumber: updatedOrder?.order_number
      });

      // Track analytics for order completion
      try {
        if (updatedOrder && updatedOrder.financial_status === 'paid') {
          console.log('📊 Tracking server-side analytics for completed order');
          
          // Get line items from Stripe session for product tracking
          const lineItems = fullSession.line_items?.data || [];
          
          // Track order completion with product sales
          serverAnalytics.trackOrderCompletedServer(updatedOrder, lineItems);
          
          // Track order status change
          const previousStatus = 'Awaiting Payment';
          serverAnalytics.trackOrderStatusChangeServer(
            updatedOrder, 
            updatedOrder.order_status, 
            previousStatus
          );
          
          console.log('📊 Server analytics tracking completed');
        }
      } catch (analyticsError) {
        console.error('📊 Error tracking server analytics (non-blocking):', analyticsError);
      }
      
      // Fetch complete order data since RPC function might not return all fields
      if (updatedOrder?.id) {
        const { data: completeOrder, error: fetchError } = await client
          .from('orders_main')
          .select('*')
          .eq('id', updatedOrder.id)
          .single();
          
        if (!fetchError && completeOrder) {
          console.log('📊 Complete order data fetched, customer_email:', completeOrder.customer_email);
          updatedOrder = completeOrder;
        } else {
          console.error('⚠️ Failed to fetch complete order data:', fetchError);
        }
      }
      
      // Send admin notification for order update (payment completion)
      try {
        console.log('📧 Attempting to send admin notification for order update...');
        const emailNotifications = require('./email-notifications');
        
        // Normalize order data for admin email
        const orderForAdminEmail = {
          ...updatedOrder,
          customerEmail: updatedOrder.customer_email,
          orderNumber: updatedOrder.order_number || updatedOrder.id,
          totalPrice: updatedOrder.total_price
        };
        
        const adminEmailResult = await emailNotifications.sendAdminNewOrderNotification(orderForAdminEmail);
        
        if (adminEmailResult.success) {
          console.log('✅ Order update admin email notification sent successfully');
        } else {
          console.error('❌ Order update admin email notification failed:', adminEmailResult.error);
        }
      } catch (emailError) {
        console.error('⚠️ Failed to send order update admin email (order still processed):', emailError);
      }
      
      // Credits were already deducted at checkout time - just confirm transaction
      if (updatedOrder.credits_applied && parseFloat(updatedOrder.credits_applied) > 0 && metadata.userId !== 'guest') {
        try {
          const creditsApplied = parseFloat(updatedOrder.credits_applied);
          console.log('💳 Confirming successful payment for pre-deducted credits:', creditsApplied);
          console.log('💳 Order ID:', updatedOrder.id);
          console.log('💳 User ID:', metadata.userId);
          
          // Mark credit transaction as confirmed (payment successful)
          if (updatedOrder.credit_transaction_id) {
            const creditHandlers = require('./credit-handlers');
            await creditHandlers.confirmTransaction(
              updatedOrder.credit_transaction_id,
              updatedOrder.id,
              'Payment completed successfully'
            );
            console.log('✅ Credit transaction confirmed - payment successful');
          } else {
            console.warn('⚠️ No credit transaction ID found for confirmation');
          }
        } catch (creditError) {
          console.error('⚠️ Error confirming credit transaction (payment still successful):', creditError);
          // Don't fail the order processing for credit confirmation errors
        }
      } else {
        console.log('💳 No pre-deducted credits to confirm:', {
          creditsApplied: updatedOrder.credits_applied,
          userId: metadata.userId,
          isGuest: metadata.userId === 'guest'
        });
      }
      
      // Record discount usage if a discount was applied
      if (cartMetadata?.discountCode && updatedOrder) {
        try {
          console.log('🏷️ Recording discount usage for code:', cartMetadata.discountCode);
          
          // Get the discount code ID from database
          const { data: discountCode } = await client
            .from('discount_codes')
            .select('id')
            .eq('code', cartMetadata.discountCode.toUpperCase())
            .single();
          
          if (discountCode) {
            await discountManager.recordUsage(
              discountCode.id,
              updatedOrder.id,
              metadata.userId !== 'guest' ? metadata.userId : null,
              metadata.userId === 'guest' ? customer.email : null,
              parseFloat(cartMetadata.discountAmount || 0)
            );
            console.log('✅ Discount usage recorded');
          }
        } catch (discountError) {
          console.error('⚠️ Failed to record discount usage:', discountError);
          // Don't fail the order processing for discount recording errors
        }
      }
      
      // Award points for purchase (5% cashback)
      if (metadata.userId && metadata.userId !== 'guest') {
        try {
          console.log('💰 Awarding points for purchase...');
          const creditHandlers = require('./credit-handlers');
          const orderTotal = parseFloat(fullSession.amount_total / 100); // Convert from cents to dollars
          
          const pointsResult = await creditHandlers.earnPointsFromPurchase(
            metadata.userId,
            orderTotal,
            updatedOrder.id
          );
          
          if (pointsResult.success) {
            console.log('✅ Points awarded successfully:', pointsResult.pointsEarned);
          } else {
            console.log('⚠️ Points earning failed:', pointsResult.message);
          }
        } catch (pointsError) {
          console.error('⚠️ Failed to award points (order still processed):', pointsError);
        }
      }

      // Send email notification for order status change
      try {
        console.log('📧 Attempting to send email notification...');
        console.log('📧 Updated order object keys:', Object.keys(updatedOrder));
        console.log('📧 Full updatedOrder object:', JSON.stringify(updatedOrder, null, 2));
        console.log('📧 Order status:', updatedOrder.order_status);
        console.log('📧 Customer email:', updatedOrder.customer_email);
        console.log('📧 Order number:', updatedOrder.order_number);
        
        // If customer email is missing, try to get it from the checkout session
        if (!updatedOrder.customer_email && customer.email) {
          console.log('⚠️ Customer email missing from order, using from Stripe session:', customer.email);
          updatedOrder.customer_email = customer.email;
        }
        
        const emailNotifications = require('./email-notifications');
        
        // Ensure order has all required fields for email (normalizing field names)
        const orderForEmail = {
          ...updatedOrder,
          customerEmail: updatedOrder.customer_email || customer.email,
          orderNumber: updatedOrder.order_number || updatedOrder.id,
          totalPrice: updatedOrder.total_price
        };
        
        console.log('📧 Order data prepared for email:', {
          hasCustomerEmail: !!orderForEmail.customer_email,
          customerEmail: orderForEmail.customer_email,
          customerEmailSource: updatedOrder.customer_email ? 'order' : 'stripe_session'
        });
        
        const emailResult = await emailNotifications.sendOrderStatusNotificationEnhanced(orderForEmail, updatedOrder.order_status);
        
        if (emailResult.success) {
          console.log('✅ Order status email notification sent successfully');
        } else {
          console.error('❌ Email notification failed:', emailResult.error);
        }
      } catch (emailError) {
        console.error('⚠️ Failed to send order status email (order still processed):', emailError);
      }
      
      // Update line items with Stripe line item IDs if needed
      if (fullSession.line_items?.data) {
        for (const lineItem of fullSession.line_items.data) {
          const itemMetadata = lineItem.price.product.metadata || {};
          
          // Extract actual quantity from metadata (since Stripe quantity is always 1 now)
          const actualQuantity = parseInt(itemMetadata.actualQuantity) || 1;
          const totalPrice = lineItem.amount_total / 100; // Total price from Stripe
          const unitPrice = totalPrice / actualQuantity; // Calculate unit price
          
          // Parse calculator selections from simplified metadata or orderNote
          let calculatorSelections = {};
          
          // First, try to rebuild from simplified metadata fields
          if (itemMetadata.size || itemMetadata.material || itemMetadata.cut) {
            console.log('📝 Rebuilding calculator selections from simplified metadata...');
            if (itemMetadata.size) {
              calculatorSelections.size = {
                type: 'size-preset',
                value: itemMetadata.size,
                displayValue: itemMetadata.size,
                priceImpact: 0
              };
            }
            if (itemMetadata.material) {
              calculatorSelections.material = {
                type: 'finish',
                value: itemMetadata.material,
                displayValue: itemMetadata.material,
                priceImpact: 0
              };
            }
            if (itemMetadata.cut) {
              calculatorSelections.cut = {
                type: 'shape',
                value: itemMetadata.cut,
                displayValue: itemMetadata.cut,
                priceImpact: 0
              };
            }
          }
          
          // If still incomplete, parse from orderNote for additional fields
          if (metadata.orderNote) {
            console.log('📝 Parsing additional selections from orderNote...');
            const orderNoteSelections = parseCalculatorSelectionsFromOrderNote(metadata.orderNote);
            // Merge with existing selections, orderNote takes precedence for completeness
            calculatorSelections = { ...calculatorSelections, ...orderNoteSelections };
          }
          
          // Update order items with calculator selections
          await client
            .from('order_items_new')
            .update({
              calculator_selections: calculatorSelections,
              updated_at: new Date().toISOString()
            })
            .eq('order_id', existingOrderId)
            .eq('product_id', itemMetadata.productId || 'custom-product');
        }
      }
      
      return;
    }
    
    // If no existing order, create a new one (fallback for direct Stripe checkouts)
    console.log('📝 No existing order found, creating new order...');
    
    // Check if this is a reorder by looking at line items metadata
    const isReorder = fullSession.line_items?.data?.some(lineItem => {
      const itemMetadata = lineItem.price.product.metadata || {};
      return itemMetadata.isReorder === 'true';
    }) || false;
    
    // Determine order status based on proof selections
    let orderStatus = 'Building Proof'; // Default status
    let proofStatus = null; // Database proof_status field
    
    if (isReorder) {
      orderStatus = 'Printing';
      proofStatus = 'approved';
    } else {
      // Check proof selections from line items
      let hasNoProofItems = false;
      let hasProofItems = false;
      
      if (fullSession.line_items?.data) {
        for (const lineItem of fullSession.line_items.data) {
          const itemMetadata = lineItem.price.product.metadata || {};
          
          // Parse calculator selections to check proof preference
          let calculatorSelections = {};
          
          // First, try to rebuild from simplified metadata fields
          if (itemMetadata.size || itemMetadata.material || itemMetadata.cut) {
            if (itemMetadata.size) {
              calculatorSelections.size = {
                type: 'size-preset',
                value: itemMetadata.size,
                displayValue: itemMetadata.size,
                priceImpact: 0
              };
            }
            if (itemMetadata.material) {
              calculatorSelections.material = {
                type: 'finish',
                value: itemMetadata.material,
                displayValue: itemMetadata.material,
                priceImpact: 0
              };
            }
            if (itemMetadata.cut) {
              calculatorSelections.cut = {
                type: 'shape',
                value: itemMetadata.cut,
                displayValue: itemMetadata.cut,
                priceImpact: 0
              };
            }
          }
          
          // Parse from orderNote for additional fields including proof selection
          if (metadata.orderNote) {
            const orderNoteSelections = parseCalculatorSelectionsFromOrderNote(metadata.orderNote);
            calculatorSelections = { ...calculatorSelections, ...orderNoteSelections };
          }
          
          // Check proof selection
          if (calculatorSelections.proof) {
            if (calculatorSelections.proof.value === false || calculatorSelections.proof.displayValue === 'No Proof') {
              hasNoProofItems = true;
            } else {
              hasProofItems = true;
            }
          } else {
            // Default to requiring proof if not specified
            hasProofItems = true;
          }
        }
      }
      
      // Set status based on proof selections
      if (hasNoProofItems && !hasProofItems) {
        // All items don't need proofs - go directly to printing
        orderStatus = 'Printing';
        proofStatus = 'approved';
        console.log('🚀 All items selected "Don\'t Send Proof" - setting order to Printing status');
      } else if (hasNoProofItems && hasProofItems) {
        // Mixed - some need proofs, some don't - default to building proof for safety
        orderStatus = 'Building Proof';
        proofStatus = null; // Will be set when proofs are sent
        console.log('📋 Mixed proof preferences - defaulting to Building Proof status');
      } else {
        // All items need proofs or default behavior
        orderStatus = 'Building Proof';
        proofStatus = null; // Will be set when proofs are sent
        console.log('📋 Proof requested - setting order to Building Proof status');
      }
    }
    
    // Create order data for Supabase
    const orderData = {
      user_id: metadata.userId !== 'guest' ? metadata.userId : null,
      guest_email: metadata.userId === 'guest' ? customer.email : null,
      stripe_payment_intent_id: fullSession.payment_intent,
      stripe_session_id: session.id,
      order_status: orderStatus,
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
      shipping_method: shippingMethodName,
      is_express_shipping: isExpressShipping,
      is_rush_order: isRushOrder,
      order_note: metadata.orderNote || '',
      order_created_at: new Date().toISOString(),
      order_updated_at: new Date().toISOString(),
    };
    
    // Add proof_status if determined
    if (proofStatus) {
      orderData.proof_status = proofStatus;
    }

    // Save to Supabase
    if (supabaseClient.isReady()) {
      const order = await supabaseClient.createCustomerOrder(orderData);
      
      if (order && fullSession.line_items?.data) {
        // Create order items
        const orderItems = fullSession.line_items.data.map(lineItem => {
          const itemMetadata = lineItem.price.product.metadata || {};
          
          // Extract actual quantity from metadata (since Stripe quantity is always 1 now)
          const actualQuantity = parseInt(itemMetadata.actualQuantity) || 1;
          const totalPrice = lineItem.amount_total / 100; // Total price from Stripe
          const unitPrice = totalPrice / actualQuantity; // Calculate unit price
          
          // Parse calculator selections from simplified metadata or orderNote
          let calculatorSelections = {};
          
          // First, try to rebuild from simplified metadata fields
          if (itemMetadata.size || itemMetadata.material || itemMetadata.cut) {
            console.log('📝 Rebuilding calculator selections from simplified metadata...');
            if (itemMetadata.size) {
              calculatorSelections.size = {
                type: 'size-preset',
                value: itemMetadata.size,
                displayValue: itemMetadata.size,
                priceImpact: 0
              };
            }
            if (itemMetadata.material) {
              calculatorSelections.material = {
                type: 'finish',
                value: itemMetadata.material,
                displayValue: itemMetadata.material,
                priceImpact: 0
              };
            }
            if (itemMetadata.cut) {
              calculatorSelections.cut = {
                type: 'shape',
                value: itemMetadata.cut,
                displayValue: itemMetadata.cut,
                priceImpact: 0
              };
            }
          }
          
          // If still incomplete, parse from orderNote for additional fields
          if (metadata.orderNote) {
            console.log('📝 Parsing additional selections from orderNote...');
            const orderNoteSelections = parseCalculatorSelectionsFromOrderNote(metadata.orderNote);
            // Merge with existing selections, orderNote takes precedence for completeness
            calculatorSelections = { ...calculatorSelections, ...orderNoteSelections };
          }
          
          return {
            order_id: order.id,
            product_id: itemMetadata.productId || 'custom-product',
            product_name: lineItem.description || lineItem.price.product.name,
            product_category: itemMetadata.category || 'Custom Stickers',
            sku: itemMetadata.sku || 'CUSTOM',
            quantity: actualQuantity, // Use actual quantity from metadata
            unit_price: unitPrice.toFixed(2), // Calculated unit price
            total_price: totalPrice.toFixed(2), // Total price from Stripe
            calculator_selections: calculatorSelections,
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
      
      // Credits were already handled at checkout time for new orders too
      if (cartMetadata?.creditsApplied && parseFloat(cartMetadata.creditsApplied) > 0 && metadata.userId !== 'guest' && order?.id) {
        const creditsApplied = parseFloat(cartMetadata.creditsApplied);
        console.log('💳 Confirming pre-deducted credits for new order:', creditsApplied);
        console.log('💳 Order ID:', order.id);
        console.log('💳 User ID:', metadata.userId);
        
        // Credits were already deducted at checkout - just confirm and track
        try {
          const client = supabaseClient.getServiceClient();
          await client
            .from('orders_main')
            .update({
              credits_applied: creditsApplied,
              updated_at: new Date().toISOString()
            })
            .eq('id', order.id);
            
          console.log('✅ New order updated with pre-deducted credits confirmation');
        } catch (creditError) {
          console.error('⚠️ Error updating new order with credit confirmation:', creditError);
          // Don't fail the order processing for tracking errors
        }
      }
      
      // Award points for purchase (5% cashback)
      if (metadata.userId && metadata.userId !== 'guest' && order?.id) {
        try {
          console.log('💰 Awarding points for new order purchase...');
          const creditHandlers = require('./credit-handlers');
          const orderTotal = parseFloat(fullSession.amount_total / 100); // Convert from cents to dollars
          
          const pointsResult = await creditHandlers.earnPointsFromPurchase(
            metadata.userId,
            orderTotal,
            order.id
          );
          
          if (pointsResult.success) {
            console.log('✅ Points awarded successfully for new order:', pointsResult.pointsEarned);
          } else {
            console.log('⚠️ Points earning failed for new order:', pointsResult.message);
          }
        } catch (pointsError) {
          console.error('⚠️ Failed to award points for new order (order still processed):', pointsError);
        }
      }

      // Send email notification for new order
      if (order?.id) {
        try {
          console.log('📧 Attempting to send new order email notification...');
          console.log('📧 New order object keys:', Object.keys(order));
          console.log('📧 Order status:', order.order_status);
          console.log('📧 Customer email:', order.customer_email);
          console.log('📧 Order number:', order.order_number);
          
          const emailNotifications = require('./email-notifications');
          
          // Make sure order has all required fields for email
          const orderForEmail = {
            ...order,
            customerEmail: order.customer_email,
            orderNumber: order.order_number || order.id,
            totalPrice: order.total_price
          };
          
          console.log('📧 Order data for email:', {
            hasCustomerEmail: !!orderForEmail.customer_email,
            customerEmail: orderForEmail.customer_email,
            orderNumber: orderForEmail.order_number,
            orderStatus: orderForEmail.order_status
          });
          
          // Send customer notification (enhanced for first-time customers)
          const emailResult = await emailNotifications.sendOrderStatusNotificationEnhanced(orderForEmail, order.order_status || 'Building Proof');
          
          if (emailResult.success) {
            console.log('✅ New order customer email notification sent successfully');
          } else {
            console.error('❌ New order customer email notification failed:', emailResult.error);
          }
          
          // Send admin notification with normalized order data
          const adminEmailResult = await emailNotifications.sendAdminNewOrderNotification(orderForEmail);
          
          if (adminEmailResult.success) {
            console.log('✅ New order admin email notification sent successfully');
          } else {
            console.error('❌ New order admin email notification failed:', adminEmailResult.error);
          }
        } catch (emailError) {
          console.error('⚠️ Failed to send new order emails (order still processed):', emailError);
        }
      }
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
  
  // Update order status if exists and handle credit reversal
  if (paymentIntent.metadata?.customerOrderId && supabaseClient.isReady()) {
    const client = supabaseClient.getServiceClient();
    
    // Get the failed order to check if credits were pre-deducted
    const { data: order } = await client
      .from('orders_main')
      .select('id, user_id, credits_applied, credit_transaction_id')
      .eq('id', paymentIntent.metadata.customerOrderId)
      .single();
    
    if (order && order.credits_applied > 0 && order.user_id) {
      try {
        console.log('💳 Reversing pre-deducted credits for failed payment:', order.credits_applied);
        console.log('💳 Transaction ID:', order.credit_transaction_id);
        
        const creditHandlers = require('./credit-handlers');
        
        // Use proper transaction reversal if we have the transaction ID
        if (order.credit_transaction_id) {
          await creditHandlers.reverseTransaction(
            order.credit_transaction_id,
            'Payment failed - reversing pre-deducted credits'
          );
          console.log('✅ Credits reversed using transaction ID');
        } else {
          // Fallback: manually add credits back
          await creditHandlers.addUserCredits({
            userId: order.user_id,
            amount: order.credits_applied,
            reason: 'Credit reversal due to payment failure (fallback method)'
          }, null);
          console.log('✅ Credits reversed using fallback method');
        }
        
        // Clear the credit fields from the order
        await client
          .from('orders_main')
          .update({
            credits_applied: 0,
            credit_transaction_id: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', order.id);
          
        console.log('✅ Order updated - credits cleared');
      } catch (creditError) {
        console.error('🚨 CRITICAL: Failed to reverse credits for failed payment:', creditError);
        // This is critical - user paid nothing but lost credits
      }
    }
    
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
      .from('orders_main')
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
async function generateOrderNumber(client) {
  try {
    // Get the highest existing order number
    const { data: existingOrders, error } = await client
      .from('orders_main')
      .select('order_number')
      .not('order_number', 'is', null)
      .like('order_number', 'SS-%')  // Only consider our format
      .order('order_number', { ascending: false })
      .limit(1);
    
    if (error) {
      console.error('Error getting highest order number:', error);
      // Fallback to timestamp-based order number
      return `SS-${Date.now().toString().slice(-6)}`;
    }
    
    let nextNumber = 1000; // Start from 1000 for 4-digit format
    
    if (existingOrders && existingOrders.length > 0) {
      const lastOrderNumber = existingOrders[0].order_number;
      console.log('📊 Last order number found:', lastOrderNumber);
      
      // Extract the number from SS-1000 format (handles both old 5-digit and new 4-digit)
      const match = lastOrderNumber.match(/SS-(\d+)/);
      if (match) {
        const lastNumber = parseInt(match[1]);
        // If the last number is less than 1000 (old format), start from 1000
        // Otherwise, increment from the last number
        nextNumber = lastNumber < 1000 ? 1000 : lastNumber + 1;
      }
    }
    
    // Generate order number: SS-1000 (4 digit number starting from 1000)
    const orderNumber = `SS-${nextNumber}`;
    console.log('📝 Generated new order number:', orderNumber);
    
    return orderNumber;
  } catch (error) {
    console.error('Error generating order number:', error);
    // Fallback to timestamp-based order number
    return `SS-${Date.now().toString().slice(-6)}`;
  }
}

// Helper function to parse calculator selections from orderNote
function parseCalculatorSelectionsFromOrderNote(orderNote) {
  const selections = {};
  
  if (!orderNote || typeof orderNote !== 'string') {
    return selections;
  }
  
  // Parse cut option (✂️)
  const cutMatch = orderNote.match(/✂️ Cut: (.+?)(?:\n|$)/);
  if (cutMatch) {
    selections.cut = {
      type: 'shape',
      value: cutMatch[1].trim(),
      displayValue: cutMatch[1].trim(),
      priceImpact: 0
    };
  }
  
  // Parse material option (✨)
  const materialMatch = orderNote.match(/✨ Material: (.+?)(?:\n|$)/);
  if (materialMatch) {
    selections.material = {
      type: 'finish',
      value: materialMatch[1].trim(),
      displayValue: materialMatch[1].trim(),
      priceImpact: 0
    };
  }
  
  // Parse size option (📏)
  const sizeMatch = orderNote.match(/📏 Size: (.+?)(?:\n|$)/);
  if (sizeMatch) {
    selections.size = {
      type: 'size-preset',
      value: sizeMatch[1].trim(),
      displayValue: sizeMatch[1].trim(),
      priceImpact: 0
    };
  }
  
  // Parse rush option (✨ Rush:)
  const rushMatch = orderNote.match(/✨ Rush: (.+?)(?:\n|$)/);
  if (rushMatch && rushMatch[1].trim() === 'Rush Order') {
    selections.rush = {
      type: 'finish',
      value: true,
      displayValue: 'Rush Order',
      priceImpact: 0 // This should be calculated based on total price
    };
  }
  
  // Parse white option if present (for clear/chrome/glitter stickers)
  const whiteMatch = orderNote.match(/⚪ White Option: (.+?)(?:\n|$)/);
  if (whiteMatch) {
    selections.whiteOption = {
      type: 'white-base',
      value: whiteMatch[1].trim(),
      displayValue: whiteMatch[1].trim(),
      priceImpact: 0
    };
  }
  
  // Parse kiss cut option if present (for sticker sheets)
  const kissCutMatch = orderNote.match(/✨ Kiss Cut: (.+?)(?:\n|$)/);
  if (kissCutMatch) {
    selections.kissCut = {
      type: 'finish',
      value: kissCutMatch[1].trim(),
      displayValue: kissCutMatch[1].trim(),
      priceImpact: 0
    };
  }
  
  // Parse proof option (📋 Proof: or ❌ No Proof)
  const proofMatch = orderNote.match(/📋 Proof: (.+?)(?:\n|$)/);
  const noProofMatch = orderNote.match(/❌ No Proof/);
  
  if (noProofMatch) {
    selections.proof = {
      type: 'finish',
      value: false,
      displayValue: 'No Proof',
      priceImpact: 0
    };
  } else if (proofMatch) {
    selections.proof = {
      type: 'finish',
      value: true,
      displayValue: proofMatch[1].trim(),
      priceImpact: 0
    };
  } else {
    // Default proof option (not usually in orderNote unless "No Proof")
    selections.proof = {
      type: 'finish',
      value: true,
      displayValue: 'Send Proof',
      priceImpact: 0
    };
  }
  
  return selections;
}

module.exports = router; 