require('dotenv').config({ path: '../.env.local' });
require('dotenv').config({ path: './.env' });
require('dotenv').config();

const { ApolloServer, gql } = require('apollo-server-express');
const express = require('express');
const cors = require('cors');
const uploadRoutes = require('./upload-routes');
const supabaseClient = require('./supabase-client');
const stripeClient = require('./stripe-client');
const stripeWebhookHandlers = require('./stripe-webhook-handlers');

// Initialize Express app
const app = express();

// Add CORS middleware
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true
}));

// Add upload routes
app.use('/api', uploadRoutes);

// Add Stripe webhook routes (before body parsing middleware)
app.use('/webhooks', stripeWebhookHandlers);

// Add health check before Apollo setup
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Sticker Shuttle API',
    environment: process.env.NODE_ENV || 'development'
  });
});

// Add a simple test endpoint
app.get('/', (req, res) => {
  res.json({ 
    message: 'Sticker Shuttle API is running',
    graphql: '/graphql',
    health: '/health'
  });
});

// Add webhook diagnostic endpoint
app.get('/webhooks/test', async (req, res) => {
  const diagnostics = {
    webhook_configured: !!process.env.STRIPE_WEBHOOK_SECRET,
    webhook_secret_prefix: process.env.STRIPE_WEBHOOK_SECRET ? process.env.STRIPE_WEBHOOK_SECRET.substring(0, 10) + '...' : 'NOT SET',
    supabase_configured: supabaseClient.isReady(),
    stripe_configured: stripeClient.isReady(),
    timestamp: new Date().toISOString()
  };

  // Try to get recent pending orders
  if (supabaseClient.isReady()) {
    try {
      const client = supabaseClient.getServiceClient();
      const { data: pendingOrders } = await client
        .from('orders_main')
        .select('id, financial_status, order_status, created_at')
        .eq('financial_status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);
      
      diagnostics.recent_pending_orders = pendingOrders || [];
    } catch (error) {
      diagnostics.pending_orders_error = error.message;
    }
  }

  res.json(diagnostics);
});

// 1. Schema
const typeDefs = gql`
  type Query {
    hello: String
    
    # Customer order queries
    getUserOrders(userId: ID!): [CustomerOrder]
    getOrderById(id: ID!): CustomerOrder
    claimGuestOrders(userId: ID!, email: String!): ClaimResult
  }

  type Mutation {
    # Customer order mutations
    createCustomerOrder(input: CustomerOrderInput!): CustomerOrder
    updateOrderStatus(orderId: String!, statusUpdate: OrderStatusInput!): CustomerOrder
    claimGuestOrders(userId: ID!, email: String!): ClaimResult
    
    # Stripe mutations
    createStripeCheckoutSession(input: StripeCheckoutInput!): StripeCheckoutResult
    processStripeCartOrder(input: CartOrderInput!): StripeOrderProcessResult
  }

  type Customer {
    id: ID
    email: String
    first_name: String
    last_name: String
    phone: String
  }

  type Address {
    first_name: String
    last_name: String
    company: String
    address1: String
    address2: String
    city: String
    province: String
    country: String
    zip: String
    phone: String
  }

  type DeleteResult {
    success: Boolean!
    message: String
  }

  # Customer Order Types
  type CustomerOrder {
    id: ID!
    userId: ID
    guestEmail: String
    stripePaymentIntentId: String
    stripeCheckoutSessionId: String
    orderNumber: String
    orderStatus: String
    fulfillmentStatus: String
    financialStatus: String
    trackingNumber: String
    trackingCompany: String
    trackingUrl: String
    subtotalPrice: Float
    totalTax: Float
    totalPrice: Float
    currency: String
    customerFirstName: String
    customerLastName: String
    customerEmail: String
    customerPhone: String
    shippingAddress: JSON
    billingAddress: JSON
    orderTags: [String]
    orderNote: String
    orderCreatedAt: String
    orderUpdatedAt: String
    createdAt: String
    updatedAt: String
    items: [OrderItem]
  }

  type OrderItem {
    id: ID!
    customerOrderId: ID!
    stripeLineItemId: String
    productId: String!
    productName: String!
    productCategory: String
    sku: String
    quantity: Int!
    unitPrice: Float!
    totalPrice: Float!
    calculatorSelections: JSON!
    customFiles: [String]
    customerNotes: String
    instagramHandle: String
    instagramOptIn: Boolean
    fulfillmentStatus: String
    createdAt: String
    updatedAt: String
  }

  type ClaimResult {
    success: Boolean!
    claimedOrdersCount: Int!
    message: String
  }

  scalar JSON

  input CustomerInput {
    email: String
    first_name: String
    last_name: String
    phone: String
  }

  input AddressInput {
    first_name: String
    last_name: String
    company: String
    address1: String
    address2: String
    city: String
    province: String
    country: String
    zip: String
    phone: String
  }

  # Customer Order Input Types
  input CustomerOrderInput {
    userId: ID
    guestEmail: String
    stripePaymentIntentId: String
    stripeCheckoutSessionId: String
    orderStatus: String
    fulfillmentStatus: String
    financialStatus: String
    subtotalPrice: Float
    totalTax: Float
    totalPrice: Float
    currency: String
    customerFirstName: String
    customerLastName: String
    customerEmail: String
    customerPhone: String
    shippingAddress: JSON
    billingAddress: JSON
    orderTags: [String]
    orderNote: String
    orderCreatedAt: String
    orderUpdatedAt: String
  }

  input CartOrderInput {
    userId: ID
    guestEmail: String
    cartItems: [CartItemInput!]!
    customerInfo: CustomerInfoInput!
    shippingAddress: AddressInput!
    billingAddress: AddressInput
    orderNote: String
  }

  input CartItemInput {
    productId: String!
    productName: String!
    productCategory: String
    sku: String
    quantity: Int!
    unitPrice: Float!
    totalPrice: Float!
    calculatorSelections: JSON!
    customFiles: [String]
    customerNotes: String
    instagramHandle: String
    instagramOptIn: Boolean
  }

  input CustomerInfoInput {
    firstName: String!
    lastName: String!
    email: String!
    phone: String
  }

  input OrderStatusInput {
    orderStatus: String
    fulfillmentStatus: String
    financialStatus: String
    trackingNumber: String
    trackingCompany: String
    trackingUrl: String
  }

  # Stripe types
  type StripeCheckoutResult {
    success: Boolean!
    sessionId: String
    checkoutUrl: String
    totalAmount: Int
    message: String
    error: String
  }

  type StripeOrderProcessResult {
    success: Boolean!
    sessionId: String
    checkoutUrl: String
    customerOrder: CustomerOrder
    message: String
    errors: [String]
  }

  input StripeCheckoutInput {
    lineItems: [StripeLineItemInput!]!
    successUrl: String!
    cancelUrl: String!
    customerEmail: String
    userId: ID
    metadata: JSON
  }

  input StripeLineItemInput {
    name: String!
    description: String
    unitPrice: Float!
    quantity: Int!
    productId: String
    sku: String
    calculatorSelections: JSON
  }
`;

// 2. Resolvers
const resolvers = {
  // Field resolvers to map database snake_case to GraphQL camelCase
  CustomerOrder: {
    userId: (parent) => parent.user_id || parent.userId,
    guestEmail: (parent) => parent.guest_email || parent.guestEmail,
    stripePaymentIntentId: (parent) => parent.stripe_payment_intent_id || parent.stripePaymentIntentId,
    stripeCheckoutSessionId: (parent) => parent.stripe_session_id || parent.stripeCheckoutSessionId,
    orderNumber: (parent) => parent.order_number || parent.orderNumber,
    orderStatus: (parent) => parent.order_status || parent.orderStatus,
    fulfillmentStatus: (parent) => parent.fulfillment_status || parent.fulfillmentStatus,
    financialStatus: (parent) => parent.financial_status || parent.financialStatus,
    trackingNumber: (parent) => parent.tracking_number || parent.trackingNumber,
    trackingCompany: (parent) => parent.tracking_company || parent.trackingCompany,
    trackingUrl: (parent) => parent.tracking_url || parent.trackingUrl,
    subtotalPrice: (parent) => parent.subtotal_price || parent.subtotalPrice,
    totalTax: (parent) => parent.total_tax || parent.totalTax,
    totalPrice: (parent) => parent.total_price || parent.totalPrice,
    customerFirstName: (parent) => parent.customer_first_name || parent.customerFirstName,
    customerLastName: (parent) => parent.customer_last_name || parent.customerLastName,
    customerEmail: (parent) => parent.customer_email || parent.customerEmail,
    customerPhone: (parent) => parent.customer_phone || parent.customerPhone,
    shippingAddress: (parent) => parent.shipping_address || parent.shippingAddress,
    billingAddress: (parent) => parent.billing_address || parent.billingAddress,
    orderTags: (parent) => parent.order_tags || parent.orderTags,
    orderNote: (parent) => parent.order_note || parent.orderNote,
    orderCreatedAt: (parent) => parent.order_created_at || parent.orderCreatedAt,
    orderUpdatedAt: (parent) => parent.order_updated_at || parent.orderUpdatedAt,
    createdAt: (parent) => parent.created_at || parent.createdAt,
    updatedAt: (parent) => parent.updated_at || parent.updatedAt
  },

  OrderItem: {
    customerOrderId: (parent) => parent.order_id || parent.customerOrderId,
    stripeLineItemId: (parent) => parent.stripe_line_item_id || parent.stripeLineItemId,
    productId: (parent) => parent.product_id || parent.productId || 'custom-product',
    productName: (parent) => parent.product_name || parent.productName || 'Custom Product',
    productCategory: (parent) => parent.product_category || parent.productCategory,
    unitPrice: (parent) => parent.unit_price || parent.unitPrice,
    totalPrice: (parent) => parent.total_price || parent.totalPrice,
    calculatorSelections: (parent) => parent.calculator_selections || parent.calculatorSelections,
    customFiles: (parent) => parent.custom_files || parent.customFiles,
    customerNotes: (parent) => parent.customer_notes || parent.customerNotes,
    instagramHandle: (parent) => parent.instagram_handle || parent.instagramHandle,
    instagramOptIn: (parent) => parent.instagram_opt_in || parent.instagramOptIn,
    fulfillmentStatus: (parent) => parent.fulfillment_status || parent.fulfillmentStatus,
    createdAt: (parent) => parent.created_at || parent.createdAt,
    updatedAt: (parent) => parent.updated_at || parent.updatedAt
  },

  Query: {
    hello: () => 'Hello, Sticker Shuttle API with Stripe Payments!',
    
    getUserOrders: async (_, { userId }) => {
      try {
        console.log('🔍 getUserOrders called with userId:', userId);
        
        if (!supabaseClient.isReady()) {
          console.error('❌ Supabase client not ready');
          throw new Error('Order history service is currently unavailable');
        }
        
        console.log('📡 Calling supabaseClient.getUserOrders...');
        const rpcData = await supabaseClient.getUserOrders(userId);
        console.log('📊 RPC data received:', rpcData.length, 'total orders');
        
        // Filter to only show paid orders in dashboard (hide draft orders with financial_status = 'pending')
        const paidOrders = rpcData.filter(order => order.financial_status === 'paid');
        console.log('💰 Filtered to paid orders:', paidOrders.length, 'of', rpcData.length, 'total');
        
        // Debug: Log the first order's items to see the actual structure
        if (paidOrders.length > 0 && paidOrders[0].items) {
          console.log('🔍 First paid order items structure:', JSON.stringify(paidOrders[0].items, null, 2));
        }
        
        // Map RPC function results to match GraphQL schema expectations (camelCase field names)
        return paidOrders.map(order => {
          // Calculate order total from items since RPC doesn't provide order-level total
          const calculatedTotal = (order.items || []).reduce((sum, item) => {
            const itemTotal = Number(item.total_price) || 0;
            return sum + itemTotal;
          }, 0);
          
          console.log(`🔍 Order ${order.order_id} calculated total: ${calculatedTotal} from ${order.items?.length || 0} items`);
          console.log(`🎯 Order ${order.order_id} Shopify data:`, {
            shopify_order_id: order.shopify_order_id,
            shopify_order_number: order.shopify_order_number,
            hasShopifyData: !!(order.shopify_order_id || order.shopify_order_number)
          });
          
          console.log(`🔍 RAW ORDER OBJECT:`, {
            keys: Object.keys(order),
            order_id: order.order_id,
            shopify_order_id: order.shopify_order_id,
            shopify_order_number: order.shopify_order_number,
            order_status: order.order_status,
            total_price: order.total_price,
            fullOrder: order
          });
          
          console.log(`🎯 RESOLVER MAPPING:`, {
            'order.shopify_order_id': order.shopify_order_id,
            'order.shopify_order_number': order.shopify_order_number,
            'mapped shopifyOrderId': order.shopify_order_id || null,
            'mapped shopifyOrderNumber': order.shopify_order_number || null
          });
          
          const mappedOrder = {
            // Map RPC field names to expected GraphQL schema field names (camelCase)
            id: String(order.order_id), // Ensure string ID
            userId: String(userId), // Ensure string ID
            guestEmail: null, // RPC doesn't return this
            stripePaymentIntentId: null, // RPC doesn't return this
            stripeCheckoutSessionId: null, // RPC doesn't return this
            orderNumber: null, // RPC doesn't return this
            orderStatus: order.order_status || 'Processing',
            fulfillmentStatus: order.fulfillment_status || 'unfulfilled',
            financialStatus: order.financial_status || 'pending',
            trackingNumber: null, // RPC doesn't return this
            trackingCompany: null,
            trackingUrl: null,
            subtotalPrice: null, // RPC doesn't return this
            totalTax: null, // RPC doesn't return this
            totalPrice: calculatedTotal, // Use calculated total from items
            currency: 'USD', // RPC doesn't return this, default to USD
            customerFirstName: null, // RPC doesn't return this
            customerLastName: null,
            customerEmail: null,
            customerPhone: null,
            shippingAddress: null,
            billingAddress: null,
            orderTags: null,
            orderNote: null,
            orderCreatedAt: order.order_created_at || new Date().toISOString(),
            orderUpdatedAt: null, // RPC doesn't return this
            createdAt: order.order_created_at || new Date().toISOString(), // Use order_created_at as fallback
            updatedAt: order.order_created_at || new Date().toISOString(), // Use order_created_at as fallback
            // Map items from JSONB to expected structure (camelCase field names)
            items: (order.items || []).map(item => ({
              id: String(item.id || `item-${Date.now()}-${Math.random()}`), // Ensure string ID
              customerOrderId: String(order.order_id), // Ensure string ID
              stripeLineItemId: null, // RPC doesn't include this in items
              productId: String(item.product_id || 'custom-product'), // Ensure non-null string
              productName: String(item.product_name || 'Custom Product'), // Ensure non-null string
              productCategory: item.product_category || 'custom',
              sku: null, // RPC doesn't include this in items
              quantity: Number(item.quantity) || 1, // Ensure non-null number
              unitPrice: Number(item.unit_price) || 0, // Ensure non-null number
              totalPrice: Number(item.total_price) || 0, // Ensure non-null number
              calculatorSelections: item.calculator_selections || {}, // Ensure non-null object
              customFiles: Array.isArray(item.custom_files) ? item.custom_files : [],
              customerNotes: item.customer_notes || '',
              instagramHandle: null, // RPC doesn't include this in items
              instagramOptIn: null, // RPC doesn't include this in items
              fulfillmentStatus: null, // RPC doesn't include this in items
              createdAt: null, // RPC doesn't include this in items
              updatedAt: null // RPC doesn't include this in items
            }))
          };

          return mappedOrder;
        });
      } catch (error) {
        console.error('Error fetching user orders:', error);
        throw new Error(error.message);
      }
    },

    getOrderById: async (_, { id }) => {
      try {
        if (!supabaseClient.isReady()) {
          throw new Error('Order service is currently unavailable');
        }
        const client = supabaseClient.getServiceClient();
        const { data, error } = await client
          .from('orders_main')
          .select(`
            *,
            items:order_items_new(*)
          `)
          .eq('id', id)
          .single();

        if (error) {
          console.error('Error fetching order:', error);
          throw new Error('Order not found');
        }

        return data;
      } catch (error) {
        console.error('Error fetching order by ID:', error);
        throw new Error(error.message);
      }
    },

    claimGuestOrders: async (_, { userId, email }) => {
      try {
        if (!supabaseClient.isReady()) {
          throw new Error('Order service is currently unavailable');
        }
        const claimedCount = await supabaseClient.claimGuestOrders(userId, email);
        return {
          success: true,
          claimedOrdersCount: claimedCount,
          message: claimedCount > 0 
            ? `Successfully claimed ${claimedCount} orders`
            : 'No guest orders found to claim'
        };
      } catch (error) {
        console.error('Error claiming guest orders:', error);
        throw new Error(error.message);
      }
    },
  },

  Mutation: {
    createCustomerOrder: async (_, { input }) => {
      try {
        if (!supabaseClient.isReady()) {
          throw new Error('Order service is currently unavailable');
        }
        return await supabaseClient.createCustomerOrder(input);
      } catch (error) {
        console.error('Error creating customer order:', error);
        throw new Error(error.message);
      }
    },

    updateOrderStatus: async (_, { orderId, statusUpdate }) => {
      try {
        if (!supabaseClient.isReady()) {
          throw new Error('Order service is currently unavailable');
        }
        return await supabaseClient.updateOrderStatus(orderId, statusUpdate);
      } catch (error) {
        console.error('Error updating order status:', error);
        throw new Error(error.message);
      }
    },

    claimGuestOrders: async (_, { userId, email }) => {
      try {
        if (!supabaseClient.isReady()) {
          throw new Error('Order service is currently unavailable');
        }
        const claimedCount = await supabaseClient.claimGuestOrders(userId, email);
        return {
          success: true,
          claimedOrdersCount: claimedCount,
          message: claimedCount > 0 
            ? `Successfully claimed ${claimedCount} orders`
            : 'No guest orders found to claim'
        };
      } catch (error) {
        console.error('Error claiming guest orders:', error);
        throw new Error(error.message);
      }
    },

    // Stripe mutations
    createStripeCheckoutSession: async (_, { input }) => {
      try {
        if (!stripeClient.isReady()) {
          throw new Error('Payment service is currently unavailable');
        }
        
        const result = await stripeClient.createCheckoutSession({
          lineItems: input.lineItems,
          successUrl: input.successUrl,
          cancelUrl: input.cancelUrl,
          customerEmail: input.customerEmail,
          userId: input.userId,
          metadata: input.metadata,
          currency: 'usd'
        });
        
        return {
          success: result.success,
          sessionId: result.sessionId,
          checkoutUrl: result.checkoutUrl,
          totalAmount: result.totalAmount,
          message: result.success ? 'Checkout session created successfully' : 'Failed to create checkout session',
          error: result.error
        };
      } catch (error) {
        console.error('Error creating Stripe checkout session:', error);
        return {
          success: false,
          message: 'Failed to create checkout session',
          error: error.message
        };
      }
    },

    processStripeCartOrder: async (_, { input }) => {
      try {
        console.log('🎯 Processing Stripe cart order...');
        console.log('📊 Input received:', JSON.stringify(input, null, 2));
        
        const errors = [];
        let checkoutSession = null;
        let customerOrder = null;

        // Step 1: Prepare order in Supabase (as pending payment)
        console.log('🔍 Checking Supabase client status...');
        console.log('Supabase ready?', supabaseClient.isReady());
        
        if (supabaseClient.isReady()) {
          try {
            const customerOrderData = {
              user_id: input.userId || null,
              guest_email: input.guestEmail || input.customerInfo.email,
              order_status: 'Awaiting Payment',
              fulfillment_status: 'unfulfilled',
              financial_status: 'pending',
              subtotal_price: input.cartItems.reduce((sum, item) => sum + item.totalPrice, 0),
              total_tax: 0, // Will be updated after Stripe checkout
              total_price: input.cartItems.reduce((sum, item) => sum + item.totalPrice, 0),
              currency: 'USD',
              customer_first_name: input.customerInfo.firstName,
              customer_last_name: input.customerInfo.lastName,
              customer_email: input.customerInfo.email,
              customer_phone: input.customerInfo.phone,
              shipping_address: input.shippingAddress,
              billing_address: input.billingAddress || input.shippingAddress,
              order_tags: generateOrderTags(input.cartItems).split(','),
              order_note: input.orderNote,
              order_created_at: new Date().toISOString(),
              order_updated_at: new Date().toISOString()
            };

            console.log('📝 Order data prepared:', JSON.stringify(customerOrderData, null, 2));
            console.log('🚀 Calling supabaseClient.createCustomerOrder...');
            
            customerOrder = await supabaseClient.createCustomerOrder(customerOrderData);
            console.log('✅ Customer order created:', customerOrder?.id);
            console.log('📊 Full order response:', JSON.stringify(customerOrder, null, 2));

            // Create order items
            if (customerOrder) {
              const orderItems = input.cartItems.map(item => ({
                order_id: customerOrder.id,
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
              console.log('✅ Order items created');
            }
          } catch (supabaseError) {
            console.error('❌ Supabase order creation failed:', supabaseError);
            errors.push(`Order tracking setup failed: ${supabaseError.message}`);
          }
        } else {
          console.error('❌ Supabase client is not ready');
          errors.push('Order tracking service is not available');
        }

        // Step 2: Create Stripe checkout session
        if (stripeClient.isReady() && errors.length === 0) {
          try {
            console.log('🔍 Stripe client is ready, creating checkout session...');
            const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            
            const checkoutData = {
              lineItems: input.cartItems.map(item => ({
                name: item.productName,
                description: `${item.productName} - Custom Configuration`,
                unitPrice: item.unitPrice,
                quantity: item.quantity,
                productId: item.productId,
                sku: item.sku,
                calculatorSelections: item.calculatorSelections
              })),
              successUrl: `${baseUrl}/order-success`,
              cancelUrl: `${baseUrl}/cart`,
              customerEmail: input.customerInfo.email,
              userId: input.userId,
              customerOrderId: customerOrder?.id,
              orderNote: generateOrderNote(input.cartItems, input.orderNote),
              cartMetadata: {
                customFiles: input.cartItems[0]?.customFiles || [],
                customerNotes: input.cartItems[0]?.customerNotes || '',
                instagramHandle: input.cartItems[0]?.instagramHandle || '',
                instagramOptIn: input.cartItems[0]?.instagramOptIn || false
              }
            };

            console.log('📊 Checkout data prepared:', JSON.stringify({
              lineItemsCount: checkoutData.lineItems.length,
              customerEmail: checkoutData.customerEmail,
              successUrl: checkoutData.successUrl,
              firstItem: checkoutData.lineItems[0]
            }, null, 2));

            const sessionResult = await stripeClient.createCheckoutSession(checkoutData);
            
            if (sessionResult.success) {
              checkoutSession = sessionResult;
              console.log('✅ Stripe checkout session created:', sessionResult.sessionId);
              
              // Update order with Stripe session ID
              if (customerOrder && supabaseClient.isReady()) {
                const client = supabaseClient.getServiceClient();
                await client
                  .from('orders_main')
                  .update({ 
                    stripe_session_id: sessionResult.sessionId,
                    updated_at: new Date().toISOString()
                  })
                  .eq('id', customerOrder.id);
              }
            } else {
              console.error('❌ Stripe session creation failed:', sessionResult);
              errors.push('Failed to create payment session');
            }
          } catch (stripeError) {
            console.error('❌ Stripe checkout creation failed:', stripeError);
            console.error('Full error details:', stripeError.stack);
            errors.push(`Payment session creation failed: ${stripeError.message}`);
          }
        } else {
          if (!stripeClient.isReady()) {
            console.error('❌ Stripe client is not ready');
            errors.push('Payment service is not available');
          }
        }

        // Always return a valid response object
        return {
          success: errors.length === 0 && checkoutSession?.success === true,
          sessionId: checkoutSession?.sessionId || null,
          checkoutUrl: checkoutSession?.checkoutUrl || null,
          customerOrder: customerOrder || null,
          message: errors.length === 0 
            ? 'Checkout session created successfully'
            : 'Order created with some issues',
          errors: errors.length > 0 ? errors : null
        };
      } catch (error) {
        console.error('❌ Stripe cart order processing failed:', error);
        console.error('Full error stack:', error.stack);
        
        // Always return a valid response object even on critical errors
        return {
          success: false,
          sessionId: null,
          checkoutUrl: null,
          customerOrder: null,
          message: `Critical error: ${error.message}`,
          errors: [error.message]
        };
      }
    }
  }
};

// Helper functions for order processing
function generateOrderNote(cartItems, additionalNote = '') {
  const itemCount = cartItems.length;
  const cartTotal = cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
  
  const itemDetails = cartItems.map((item, index) => {
    const configDetails = [];
    
    // Add item header
    configDetails.push(`--- ITEM ${index + 1}: ${item.productName} ---`);
    
    // Add calculator selections
    if (item.calculatorSelections) {
      Object.entries(item.calculatorSelections).forEach(([key, value]) => {
        if (value && typeof value === 'object' && value.displayValue) {
          // Skip rush order when it's set to "Standard" (not a rush order)
          if (key === 'rush' && value.displayValue === 'Standard') {
            return;
          }
          // Skip proof option when it's set to "Send Proof" (default behavior)
          if (key === 'proof' && value.displayValue === 'Send Proof') {
            return;
          }
          configDetails.push(`${getOptionEmoji(value.type)} ${formatOptionName(key)}: ${value.displayValue}`);
        }
      });
    }
    
    // Add quantity and pricing
    configDetails.push(`#️⃣ Quantity: ${item.quantity}`);
    configDetails.push(`💰 Unit Price: $${item.unitPrice.toFixed(2)}`);
    configDetails.push(`💎 Total: $${item.totalPrice.toFixed(2)}`);
    
    // Add custom files if present
    if (item.customFiles && item.customFiles.length > 0) {
      configDetails.push('', '🔗 Cloudinary URL:', '', item.customFiles[0]);
    }
    
    // Add custom notes if present
    if (item.customerNotes && item.customerNotes.trim()) {
      configDetails.push('', '📝 Additional Instructions:', item.customerNotes.trim());
    }
    
    configDetails.push(''); // Empty line between items
    return configDetails.join('\n');
  });

  const orderNote = [
    `🛒 CART ORDER - ${itemCount} item${itemCount > 1 ? 's' : ''}`,
    `💎 Cart Total: $${cartTotal.toFixed(2)}`,
    '',
    ...itemDetails
  ];

  if (additionalNote && additionalNote.trim()) {
    orderNote.push('📝 Additional Order Notes:', additionalNote.trim());
  }

  return orderNote.join('\n');
}

function generateOrderTags(cartItems) {
  const tags = ['cart-order', `items-${cartItems.length}`];
  
  cartItems.forEach(item => {
    if (item.productCategory) {
      tags.push(item.productCategory);
    }
    
    // Add calculator selection tags
    if (item.calculatorSelections) {
      Object.values(item.calculatorSelections).forEach(selection => {
        if (selection && typeof selection === 'object' && selection.value) {
          if (typeof selection.value === 'string') {
            tags.push(selection.value.toLowerCase().replace(/[^a-z0-9]/g, '-'));
          }
        }
      });
    }
  });
  
  // Return as comma-separated string (Shopify expects string, not array)
  return [...new Set(tags)].join(',');
}

function getOptionEmoji(type) {
  const emojiMap = {
    'shape': '✂️',
    'finish': '✨',
    'size-preset': '📏',
    'white-base': '⚪',
    'quantity': '#️⃣'
  };
  return emojiMap[type] || '🔸';
}

function formatOptionName(name) {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}

// 3. Server setup
const server = new ApolloServer({ 
  typeDefs, 
  resolvers,
  context: ({ req }) => {
    // You can add authentication context here later
    return {
      supabase: supabaseClient,
      stripe: stripeClient
    };
  }
});

// 4. Start server with Express + Apollo
async function startServer() {
  try {
    await server.start();
    server.applyMiddleware({ app, path: '/graphql' }); // GraphQL at /graphql

    const PORT = process.env.PORT || 4000;
    
    app.listen(PORT, () => {
      console.log(`🚀 Server running at http://localhost:${PORT}`);
      console.log(`🚀 GraphQL Playground: http://localhost:${PORT}/graphql`);
      console.log(`📁 File upload endpoint: http://localhost:${PORT}/api/upload`);
      console.log(`💚 Health check: http://localhost:${PORT}/health`);
      console.log(`💳 Stripe webhooks: http://localhost:${PORT}/webhooks/stripe`);
      
      // Check Stripe configuration
      if (stripeClient.isReady()) {
        console.log('✅ Stripe payment system is configured');
      } else {
        console.log('⚠️  Stripe is not configured - payment features will not work');
      }
      
      // Check Supabase configuration  
      if (supabaseClient.isReady()) {
        console.log('✅ Supabase database is configured');
      } else {
        console.log('⚠️  Supabase is not configured - order tracking will not work');
      }
    });
  } catch (error) {
    console.error('❌ Failed to start Apollo Server:', error);
    
    // Start basic Express server even if Apollo fails
    const PORT = process.env.PORT || 4000;
    app.listen(PORT, () => {
      console.log(`🚀 Basic server running at http://localhost:${PORT}`);
      console.log(`💚 Health check: http://localhost:${PORT}/health`);
      console.log('⚠️  GraphQL is not available due to configuration issues');
    });
  }
}

startServer().catch(error => {
  console.error('❌ Complete server startup failed:', error);
  process.exit(1);
});
