const { ApolloServer, gql } = require('apollo-server-express');
const express = require('express');
const cors = require('cors');
const ShopifyClient = require('./shopify-client');
const { validateConfig } = require('./shopify-config');
const uploadRoutes = require('./upload-routes');

// Initialize Express app
const app = express();

// Add CORS middleware
app.use(cors({
  origin: ['http://localhost:3000', 'http://frontend:3000'],
  credentials: true
}));

// Add upload routes
app.use('/api', uploadRoutes);

// Add a simple root route
app.get('/', (req, res) => {
  res.json({
    message: 'Sticker Shuttle API is running! 🚀',
    version: '1.0.0',
    endpoints: {
      graphql: '/graphql',
      upload: '/api/upload'
    },
    status: 'healthy'
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
  }

  type Mutation {
    createDraftOrder(input: DraftOrderInput!): DraftOrder
    completeDraftOrder(id: ID!): DraftOrder
    updateDraftOrder(id: ID!, input: DraftOrderUpdateInput!): DraftOrder
    deleteDraftOrder(id: ID!): DeleteResult
    createCheckoutUrl(draftOrderId: ID!): CheckoutUrlResult
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
`;

// 2. Resolvers
const resolvers = {
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
    }
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
    }
  }
};

// 3. Server setup
const server = new ApolloServer({ 
  typeDefs, 
  resolvers,
  context: ({ req }) => {
    // You can add authentication context here later
    return {
      shopify
    };
  }
});

// 4. Start server with Express + Apollo
async function startServer() {
  await server.start();
  server.applyMiddleware({ app, path: '/graphql' });

  const PORT = process.env.PORT || 4000;
  
  app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
    console.log(`🚀 GraphQL endpoint: http://localhost:${PORT}${server.graphqlPath}`);
    console.log(`📁 File upload endpoint: http://localhost:${PORT}/api/upload`);
    
    // Validate Shopify configuration
    if (validateConfig()) {
      console.log('✅ Shopify configuration is valid');
    } else {
      console.log('⚠️  Please configure your Shopify API credentials');
    }
  });
}

startServer().catch(error => {
  console.error('Failed to start server:', error);
});
