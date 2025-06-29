const express = require('express');
const stripeClient = require('./stripe-client');
const supabaseClient = require('./supabase-client');
const notificationHelpers = require('./notification-helpers');
const { discountManager } = require('./discount-manager');
const { createGuestAccount, emailExists } = require('./guest-account-manager');

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
    // Get full session details to access metadata and line items
    const stripe = require('./stripe-client');
    const fullSession = await stripe.getCheckoutSession(session.id);
    const metadata = fullSession.metadata || {};
    const cartMetadata = fullSession.metadata?.cartData ? JSON.parse(fullSession.metadata.cartData) : {};
    
    console.log('📋 Full session metadata:', metadata);
    console.log('🛒 Cart metadata:', cartMetadata);
    
    // Get customer info and shipping address
    const customer = fullSession.customer_details || {};
    const shippingAddress = fullSession.shipping_details?.address || fullSession.customer_details?.address || {};
    
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
      };
      
      // Add proof_status if determined
      if (proofStatus) {
        updateData.proof_status = proofStatus;
      }
      
      const { data: updatedOrder, error: updateError } = await client
        .from('orders_main')
        .update(updateData)
        .eq('id', existingOrderId)
        .select()
        .single();
      
      if (updateError) {
        console.error('❌ Error updating order:', updateError);
        throw updateError;
      }
      
      console.log('✅ Order updated successfully:', updatedOrder?.id);
      console.log('🔍 Order status after update:', {
        orderId: updatedOrder?.id,
        orderStatus: updatedOrder?.order_status,
        financialStatus: updatedOrder?.financial_status,
        orderNumber: updatedOrder?.order_number
      });
      
      // Send admin notification for order update (payment completion)
      try {
        console.log('📧 Attempting to send admin notification for order update...');
        const emailNotifications = require('./email-notifications');
        
        const adminEmailResult = await emailNotifications.sendAdminNewOrderNotification(updatedOrder);
        
        if (adminEmailResult.success) {
          console.log('✅ Order update admin email notification sent successfully');
        } else {
          console.error('❌ Order update admin email notification failed:', adminEmailResult.error);
        }
      } catch (emailError) {
        console.error('⚠️ Failed to send order update admin email (order still processed):', emailError);
      }
      
      // NOW deduct credits when payment is successful
      if (updatedOrder.credits_to_apply && parseFloat(updatedOrder.credits_to_apply) > 0 && metadata.userId !== 'guest') {
        try {
          const creditsToApply = parseFloat(updatedOrder.credits_to_apply);
          console.log('💳 Deducting credits on successful payment:', creditsToApply);
          console.log('💳 Order ID:', updatedOrder.id);
          console.log('💳 User ID:', metadata.userId);
          
          // Actually deduct the credits now
          const creditHandlers = require('./credit-handlers');
          const creditResult = await creditHandlers.applyCreditsToOrder(
            updatedOrder.id,
            creditsToApply,
            metadata.userId
          );
          
          if (creditResult.success) {
            console.log('✅ Credits deducted successfully on payment completion:', creditResult.remainingBalance);
            
            // Update the order record to track credits used and clear credits_to_apply
            await client
              .from('orders_main')
              .update({
                credits_applied: creditsToApply,
                credits_to_apply: null, // Clear the pending credit amount
                updated_at: new Date().toISOString()
              })
              .eq('id', updatedOrder.id);
              
            console.log('✅ Order updated with final credits tracking');
          } else {
            console.error('⚠️ Failed to deduct credits on payment completion:', creditResult.error);
            // Don't fail the order processing, but log the issue
          }
        } catch (creditError) {
          console.error('⚠️ Critical error deducting credits on payment completion:', creditError);
          // Don't fail the order processing for credit errors
        }
      } else {
        console.log('💳 No credits to deduct:', {
          creditsToApply: updatedOrder.credits_to_apply,
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
        console.log('📧 Order status:', updatedOrder.order_status);
        console.log('📧 Customer email:', updatedOrder.customer_email);
        console.log('📧 Order number:', updatedOrder.order_number);
        
        const emailNotifications = require('./email-notifications');
        const emailResult = await emailNotifications.sendOrderStatusNotification(updatedOrder, updatedOrder.order_status);
        
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
      
      // Handle credits for new orders (fallback case)
      if (cartMetadata?.creditsApplied && parseFloat(cartMetadata.creditsApplied) > 0 && metadata.userId !== 'guest' && order?.id) {
        try {
          const creditsToApply = parseFloat(cartMetadata.creditsApplied);
          console.log('💳 Deducting credits for new order on successful payment:', creditsToApply);
          console.log('💳 Order ID:', order.id);
          console.log('💳 User ID:', metadata.userId);
          
          // Actually deduct the credits now
          const creditHandlers = require('./credit-handlers');
          const creditResult = await creditHandlers.applyCreditsToOrder(
            order.id,
            creditsToApply,
            metadata.userId
          );
          
          if (creditResult.success) {
            console.log('✅ Credits deducted successfully for new order:', creditResult.remainingBalance);
            
            // Update the order record to track credits used
            const client = supabaseClient.getServiceClient();
            await client
              .from('orders_main')
              .update({
                credits_applied: creditsToApply,
                updated_at: new Date().toISOString()
              })
              .eq('id', order.id);
              
            console.log('✅ New order updated with credits tracking');
          } else {
            console.error('⚠️ Failed to deduct credits for new order:', creditResult.error);
            // Don't fail the order processing, but log the issue
          }
        } catch (creditError) {
          console.error('⚠️ Critical error deducting credits for new order:', creditError);
          // Don't fail the order processing for credit errors
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
          
          // Send customer notification
          const emailResult = await emailNotifications.sendOrderStatusNotification(order, order.order_status || 'Building Proof');
          
          if (emailResult.success) {
            console.log('✅ New order customer email notification sent successfully');
          } else {
            console.error('❌ New order customer email notification failed:', emailResult.error);
          }
          
          // Send admin notification
          const adminEmailResult = await emailNotifications.sendAdminNewOrderNotification(order);
          
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
    
    // Get the failed order to check if credits were applied
    const { data: order } = await client
      .from('orders_main')
      .select('id, user_id, credits_applied')
      .eq('id', paymentIntent.metadata.customerOrderId)
      .single();
    
    if (order && order.credits_applied > 0 && order.user_id) {
      try {
        console.log('💳 Reversing credits for failed payment:', order.credits_applied);
        
        // Add back the credits that were deducted
        const creditHandlers = require('./credit-handlers');
        await creditHandlers.addUserCredits({
          userId: order.user_id,
          amount: order.credits_applied,
          reason: 'Credit reversal due to payment failure'
        }, null);
        
        console.log('✅ Credits reversed successfully');
      } catch (creditError) {
        console.error('⚠️ Failed to reverse credits:', creditError);
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
async function generateOrderNumber(supabaseClient) {
  try {
    // Get the highest existing order number
    const { data: existingOrders, error } = await supabaseClient
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
  const whiteMatch = orderNote.match(/✨ White Option: (.+?)(?:\n|$)/);
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