require('dotenv').config({ path: '../.env.local' });
require('dotenv').config({ path: './.env' });
require('dotenv').config();

const { ApolloServer, gql } = require('apollo-server-express');
const express = require('express');
const cors = require('cors');
const ShopifyClient = require('./shopify-client');
const { validateConfig } = require('./shopify-config');
const uploadRoutes = require('./upload-routes');
const webhookHandlers = require('./webhook-handlers');
const supabaseClient = require('./supabase-client');

// Initialize Express app
const app = express();

// Add CORS middleware
app.use(cors({
  origin: true, // Allow all origins in development
  credentials: true
}));

// Add upload routes
app.use('/api', uploadRoutes);

// Add webhook routes
app.use('/webhooks', webhookHandlers);

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

// Initialize Shopify client
const shopify = new ShopifyClient();

// 1. Schema
const typeDefs = gql`
  type Query {
    hello: String
    getDraftOrder(id: ID!): DraftOrder
    getAllDraftOrders(limit: Int, status: String): [DraftOrder]
    getProduct(id: ID!): Product
    getProductVariants(productId: ID!): [ProductVariant]
    
    # Customer order queries
    getUserOrders(userId: ID!): [CustomerOrder]
    getOrderById(id: ID!): CustomerOrder
    syncShopifyOrders(userId: ID!, email: String!): SyncResult
    
    # Webhook queries
    setupWebhooks(baseUrl: String!): [WebhookResult]
  }

  type Mutation {
    createDraftOrder(input: DraftOrderInput!): DraftOrder
    completeDraftOrder(id: ID!): DraftOrder
    updateDraftOrder(id: ID!, input: DraftOrderUpdateInput!): DraftOrder
    deleteDraftOrder(id: ID!): DeleteResult
    createCheckoutUrl(draftOrderId: ID!): CheckoutUrlResult
    
    # Customer order mutations
    createCustomerOrder(input: CustomerOrderInput!): CustomerOrder
    processCartOrder(input: CartOrderInput!): OrderProcessResult
    updateOrderStatus(shopifyOrderId: String!, statusUpdate: OrderStatusInput!): CustomerOrder
    claimGuestOrders(userId: ID!, email: String!): ClaimResult
    
    # Webhook management
    setupWebhooks(baseUrl: String!): [WebhookResult]
  }

  type DraftOrder {
    id: ID!
    order_id: ID
    name: String
    customer: Customer
    shipping_address: Address
    billing_address: Address
    line_items: [LineItem]
    subtotal_price: String
    total_tax: String
    total_price: String
    currency: String
    invoice_url: String
    status: String
    created_at: String
    updated_at: String
    note: String
    tags: String
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

  type LineItem {
    id: ID
    variant_id: ID
    product_id: ID
    title: String
    variant_title: String
    sku: String
    quantity: Int
    price: String
    grams: Int
  }

  type DeleteResult {
    success: Boolean!
    message: String
  }

  type CheckoutUrlResult {
    checkoutUrl: String!
    draftOrderId: ID!
    totalPrice: String
  }

  type Product {
    id: ID!
    title: String
    handle: String
    product_type: String
    vendor: String
    tags: String
    status: String
    images: [ProductImage]
    variants: [ProductVariant]
  }

  type ProductImage {
    id: ID
    src: String
    alt: String
  }

  type ProductVariant {
    id: ID!
    product_id: ID
    title: String
    price: String
    sku: String
    inventory_quantity: Int
    inventory_management: String
    inventory_policy: String
    weight: Float
    weight_unit: String
  }

  # Customer Order Types
  type CustomerOrder {
    id: ID!
    userId: ID
    guestEmail: String
    shopifyOrderId: String
    shopifyOrderNumber: String
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
    shopifyLineItemId: String
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

  type OrderProcessResult {
    success: Boolean!
    customerOrder: CustomerOrder
    shopifyOrder: DraftOrder
    message: String
    errors: [String]
  }

  type ClaimResult {
    success: Boolean!
    claimedOrdersCount: Int!
    message: String
  }

  type SyncResult {
    success: Boolean!
    synced: Int!
    total: Int!
    message: String
  }

  # Webhook Types
  type Webhook {
    id: ID!
    topic: String!
    address: String!
    format: String!
    created_at: String
    updated_at: String
  }

  type WebhookResult {
    topic: String!
    success: Boolean!
    webhook: Webhook
    error: String
  }

  scalar JSON

  input DraftOrderInput {
    lineItems: [LineItemInput!]!
    customer: CustomerInput
    shippingAddress: AddressInput
    billingAddress: AddressInput
    email: String
    note: String
    tags: String
  }

  input DraftOrderUpdateInput {
    lineItems: [LineItemInput]
    customer: CustomerInput
    shippingAddress: AddressInput
    billingAddress: AddressInput
    email: String
    note: String
    tags: String
  }

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

  input LineItemInput {
    variant_id: ID
    product_id: ID
    title: String!
    quantity: Int!
    price: String!
    sku: String
    grams: Int
  }

  # Customer Order Input Types
  input CustomerOrderInput {
    userId: ID
    guestEmail: String
    shopifyOrderId: String!
    shopifyOrderNumber: String
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
`;

// 2. Resolvers
const resolvers = {
  // Field resolvers to map database snake_case to GraphQL camelCase
  CustomerOrder: {
    userId: (parent) => parent.user_id || parent.userId,
    guestEmail: (parent) => parent.guest_email || parent.guestEmail,
    shopifyOrderId: (parent) => parent.shopify_order_id || parent.shopifyOrderId,
    shopifyOrderNumber: (parent) => parent.shopify_order_number || parent.shopifyOrderNumber,
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
    customerOrderId: (parent) => parent.customer_order_id || parent.customerOrderId,
    shopifyLineItemId: (parent) => parent.shopify_line_item_id || parent.shopifyLineItemId,
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
    hello: () => 'Hello, Sticker Shuttle with Shopify Integration!',
    
    getDraftOrder: async (_, { id }) => {
      try {
        return await shopify.getDraftOrder(id);
      } catch (error) {
        throw new Error(error.message);
      }
    },

    getAllDraftOrders: async (_, { limit, status }) => {
      try {
        return await shopify.getAllDraftOrders({ limit, status });
      } catch (error) {
        throw new Error(error.message);
      }
    },

    getProduct: async (_, { id }) => {
      try {
        return await shopify.getProduct(id);
      } catch (error) {
        throw new Error(error.message);
      }
    },

    getProductVariants: async (_, { productId }) => {
      try {
        return await shopify.getProductVariants(productId);
      } catch (error) {
        throw new Error(error.message);
      }
    },

    // Customer order queries
    getUserOrders: async (_, { userId }) => {
      try {
        console.log('🔍 getUserOrders called with userId:', userId);
        
        if (!supabaseClient.isReady()) {
          console.error('❌ Supabase client not ready');
          throw new Error('Order history service is currently unavailable');
        }
        
        console.log('📡 Calling supabaseClient.getUserOrders...');
        const rpcData = await supabaseClient.getUserOrders(userId);
        console.log('📊 RPC data received:', rpcData.length, 'orders');
        
        // Debug: Log the first order's items to see the actual structure
        if (rpcData.length > 0 && rpcData[0].items) {
          console.log('🔍 First order items structure:', JSON.stringify(rpcData[0].items, null, 2));
        }
        
        // Map RPC function results to match GraphQL schema expectations (camelCase field names)
        return rpcData.map(order => {
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
            shopifyOrderId: order.shopify_order_id || null,
            shopifyOrderNumber: order.shopify_order_number || null,
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
              shopifyLineItemId: null, // RPC doesn't include this in items
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
          .from('customer_orders')
          .select(`
            *,
            items:order_items(*)
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

    // Webhook management
    setupWebhooks: async (_, { baseUrl }) => {
      try {
        return await shopify.setupOrderWebhooks(baseUrl);
      } catch (error) {
        throw new Error(error.message);
      }
    },

    // Sync Shopify orders - TEMPORARILY DISABLED (missing sync module)
    syncShopifyOrders: async (_, { userId, email }) => {
      console.log('⚠️ Sync functionality temporarily disabled');
      return {
        success: false,
        synced: 0,
        total: 0,
        message: 'Sync functionality temporarily disabled'
      };
    },
  },

  Mutation: {
    createDraftOrder: async (_, { input }) => {
      try {
        console.log('📝 GraphQL createDraftOrder input:', JSON.stringify(input, null, 2));
        const result = await shopify.createDraftOrder(input);
        console.log('✅ Draft order created successfully:', result.id);
        return result;
      } catch (error) {
        console.error('❌ GraphQL createDraftOrder error:', error.message);
        throw new Error(error.message);
      }
    },

    completeDraftOrder: async (_, { id }) => {
      try {
        return await shopify.completeDraftOrder(id);
      } catch (error) {
        throw new Error(error.message);
      }
    },

    updateDraftOrder: async (_, { id, input }) => {
      try {
        return await shopify.updateDraftOrder(id, input);
      } catch (error) {
        throw new Error(error.message);
      }
    },

    deleteDraftOrder: async (_, { id }) => {
      try {
        return await shopify.deleteDraftOrder(id);
      } catch (error) {
        throw new Error(error.message);
      }
    },

    createCheckoutUrl: async (_, { draftOrderId }) => {
      try {
        return await shopify.createCheckoutUrl(draftOrderId);
      } catch (error) {
        throw new Error(error.message);
      }
    },

    // Customer order mutations
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

    processCartOrder: async (_, { input }) => {
      try {
        console.log('🛒 Processing cart order...', JSON.stringify(input, null, 2));
        
        const errors = [];
        let shopifyOrder = null;
        let customerOrder = null;

        // Step 1: Create Shopify draft order
        try {
          const shopifyInput = {
            lineItems: input.cartItems.map(item => ({
              title: `${item.productName} - Custom Configuration`,
              quantity: item.quantity,
              price: item.unitPrice.toString(),
              sku: item.sku || `${item.productId}-CUSTOM`
            })),
            customer: {
              email: input.customerInfo.email,
              first_name: input.customerInfo.firstName,
              last_name: input.customerInfo.lastName,
              phone: input.customerInfo.phone
            },
            // Only include addresses if they have meaningful data
            ...(input.shippingAddress?.address1 && { shippingAddress: input.shippingAddress }),
            ...(input.billingAddress?.address1 && { billingAddress: input.billingAddress }),
            email: input.customerInfo.email,
            note: generateOrderNote(input.cartItems, input.orderNote),
            tags: generateOrderTags(input.cartItems)
          };

          shopifyOrder = await shopify.createDraftOrder(shopifyInput);
          console.log('✅ Shopify draft order created:', shopifyOrder.id);
        } catch (shopifyError) {
          console.error('❌ Shopify order creation failed:', shopifyError);
          errors.push(`Shopify order creation failed: ${shopifyError.message}`);
        }

        // Step 2: Create Supabase order record for tracking (including draft orders)
        // Draft orders will show in dashboard until payment is completed
        if (shopifyOrder && supabaseClient.isReady()) {
          try {
            // Set initial status based on order type
            let initialStatus = 'Awaiting Payment';
            let financialStatus = 'pending';
            
            // If it's a real paid order (not draft), set to Creating Proofs
            if (!shopifyOrder.name.startsWith('#D')) {
              initialStatus = 'Creating Proofs';
              financialStatus = shopifyOrder.financial_status || 'pending';
            }

            const customerOrderData = {
              user_id: input.userId || null,
              guest_email: input.guestEmail || input.customerInfo.email,
              shopify_order_id: shopifyOrder.id.toString(), // Ensure string format for consistency
              shopify_order_number: shopifyOrder.name,
              order_status: initialStatus,  // Awaiting Payment for drafts, Creating Proofs for paid
              fulfillment_status: 'unfulfilled',
              financial_status: financialStatus,
              subtotal_price: parseFloat(shopifyOrder.subtotal_price),
              total_tax: parseFloat(shopifyOrder.total_tax || '0'),
              total_price: parseFloat(shopifyOrder.total_price),
              currency: shopifyOrder.currency,
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

            // The createCustomerOrder method now has built-in duplicate prevention
            customerOrder = await supabaseClient.createCustomerOrder(customerOrderData);
            console.log('✅ Customer order created/found:', customerOrder.id, 'Status:', initialStatus);

            // Step 3: Create order items with calculator data
            if (customerOrder) {
              const orderItems = input.cartItems.map(item => ({
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
              console.log('✅ Order items created');
            }
          } catch (supabaseError) {
            console.error('❌ Supabase order creation failed:', supabaseError);
            errors.push(`Order tracking setup failed: ${supabaseError.message}`);
          }
        }

        return {
          success: errors.length === 0,
          customerOrder,
          shopifyOrder,
          message: errors.length === 0 
            ? 'Order processed successfully!' 
            : 'Order created with some issues',
          errors: errors.length > 0 ? errors : null
        };
      } catch (error) {
        console.error('❌ Cart order processing failed:', error);
        throw new Error(error.message);
      }
    },

    updateOrderStatus: async (_, { shopifyOrderId, statusUpdate }) => {
      try {
        if (!supabaseClient.isReady()) {
          throw new Error('Order service is currently unavailable');
        }
        return await supabaseClient.updateOrderStatus(shopifyOrderId, statusUpdate);
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
      shopify,
      supabase: supabaseClient
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
      
      // Validate Shopify configuration
      if (validateConfig()) {
        console.log('✅ Shopify configuration is valid');
      } else {
        console.log('⚠️  Please configure your Shopify API credentials');
        console.log('⚠️  API will start but GraphQL features may not work properly');
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
