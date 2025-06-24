const express = require('express');
const stripeClient = require('./stripe-client');
const supabaseClient = require('./supabase-client');
const notificationHelpers = require('./notification-helpers');
const { discountManager } = require('./discount-manager');

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

// Test endpoint for Discord notifications
router.post('/test-discord-notification/:orderId', async (req, res) => {
  try {
    console.log('🧪 Test endpoint: Testing Discord notification for order', req.params.orderId);
    
    const result = await notificationHelpers.triggerOrderStatusNotification(req.params.orderId, 'Awaiting Payment');
    
    res.json({ 
      success: result.success, 
      message: result.message || 'Notification test completed',
      orderId: req.params.orderId
    });
  } catch (error) {
    console.error('Test Discord notification error:', error);
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
    
    // Look for existing order by Stripe session ID
    let existingOrderId = null;
    
    if (supabaseClient.isReady()) {
      const client = supabaseClient.getServiceClient();
      
      const { data: existingOrders, error } = await client
        .from('orders_main')
        .select('id')
        .eq('stripe_session_id', session.id)
        .limit(1);
      
      if (error) {
        console.error('❌ Error checking for existing orders:', error);
      } else if (existingOrders && existingOrders.length > 0) {
        existingOrderId = existingOrders[0].id;
        console.log('📝 Found existing order:', existingOrderId);
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
      
      // Credits are now deducted at checkout time, not in webhook
      // Just ensure the order is updated with credits_applied field
      if (cartMetadata?.creditsApplied && parseFloat(cartMetadata.creditsApplied) > 0 && metadata.userId !== 'guest') {
        try {
          console.log('💳 Updating order with credits already applied:', cartMetadata.creditsApplied);
          console.log('💳 Order ID:', updatedOrder.id);
          
          // Just update the order record to track credits used
          await client
            .from('orders_main')
            .update({
              credits_applied: parseFloat(cartMetadata.creditsApplied),
              updated_at: new Date().toISOString()
            })
            .eq('id', updatedOrder.id);
          
          console.log('✅ Order updated with credits tracking');
        } catch (updateError) {
          console.error('⚠️ Failed to update order with credits tracking:', updateError);
          // Don't fail the order processing for this error
        }
      } else {
        console.log('💳 No credits to track:', {
          creditsApplied: cartMetadata?.creditsApplied,
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

      // Trigger Discord notification for new order (manual trigger since status wasn't changed)
      try {
        console.log('📱 Triggering Discord notification for new order...');
        await notificationHelpers.triggerOrderStatusNotification(updatedOrder.id, 'Awaiting Payment');
      } catch (notificationError) {
        console.error('⚠️ Failed to send Discord notification (order still processed):', notificationError);
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
      
      // Credits are now deducted at checkout time, not in webhook
      // Just update order tracking for new orders (credits already deducted)
      if (cartMetadata?.creditsApplied && parseFloat(cartMetadata.creditsApplied) > 0 && metadata.userId !== 'guest' && order?.id) {
        try {
          console.log('💳 Updating new order with credits already applied:', cartMetadata.creditsApplied);
          console.log('💳 Order ID:', order.id);
          
          // Just update the order record to track credits used
          const client = supabaseClient.getServiceClient();
          await client
            .from('orders_main')
            .update({
              credits_applied: parseFloat(cartMetadata.creditsApplied),
              updated_at: new Date().toISOString()
            })
            .eq('id', order.id);
          
          console.log('✅ New order updated with credits tracking');
        } catch (updateError) {
          console.error('⚠️ Failed to update new order with credits tracking:', updateError);
          // Don't fail the order processing for this error
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

      // Trigger Discord notification for new order (manual trigger since status wasn't changed)
      if (order?.id) {
        try {
          console.log('📱 Triggering Discord notification for new order...');
          await notificationHelpers.triggerOrderStatusNotification(order.id, 'Awaiting Payment');
        } catch (notificationError) {
          console.error('⚠️ Failed to send Discord notification (order still processed):', notificationError);
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