require('dotenv').config({ path: '../.env.local' });
require('dotenv').config({ path: './.env.local' });
require('dotenv').config({ path: './.env' });
require('dotenv').config();

const { ApolloServer, gql } = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const express = require('express');
const cors = require('cors');
const { json } = require('body-parser');
const { GraphQLError } = require('graphql');
const uploadRoutes = require('./upload-routes');
const supabaseClient = require('./supabase-client');
const stripeClient = require('./stripe-client');
const stripeWebhookHandlers = require('./stripe-webhook-handlers');
const easyPostClient = require('./easypost-client');
const EasyPostTrackingEnhancer = require('./easypost-tracking-enhancer');
const { discountManager } = require('./discount-manager');
const creditHandlers = require('./credit-handlers');

// Initialize enhanced tracking
const trackingEnhancer = new EasyPostTrackingEnhancer(easyPostClient);

// Initialize credit handlers with Supabase client
creditHandlers.initializeWithSupabase(supabaseClient);

// Log initial status of all services
console.log('🚀 Initial service status:');
console.log('  - Supabase:', supabaseClient.isReady() ? '✅ Ready' : '❌ Not configured');
console.log('  - Stripe:', stripeClient.isReady() ? '✅ Ready' : '❌ Not configured');
console.log('  - EasyPost:', easyPostClient.isReady() ? '✅ Ready' : '❌ Not configured');

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

// Add EasyPost webhook routes (before Apollo setup)
app.use('/webhooks', stripeWebhookHandlers);

// Add EasyPost webhook endpoint with enhanced tracking
app.post('/webhooks/easypost', express.raw({ type: 'application/json' }), async (req, res) => {
  console.log('📦 EasyPost webhook received');
  
  try {
    const event = req.body;
    const eventData = JSON.parse(event.toString());
    
    console.log('🔍 EasyPost Event:', {
      type: eventData.description,
      object: eventData.result?.object,
      trackingCode: eventData.result?.tracking_code,
      status: eventData.result?.status,
      carrier: eventData.result?.carrier
    });
    
    // Handle tracker updates with enhanced processing
    if (eventData.result && eventData.result.object === 'Tracker') {
      const tracker = eventData.result;
      
      console.log(`📍 Enhanced tracking update: ${tracker.tracking_code} -> ${tracker.status}`);
      
      // Use enhanced tracking processor
      const success = await trackingEnhancer.processTrackingUpdate(tracker);
      
      if (success) {
        console.log('✅ Tracking update processed successfully');
      } else {
        console.warn('⚠️ Tracking update processing failed');
      }
    }
    
    res.status(200).json({ received: true });
  } catch (error) {
    console.error('❌ EasyPost webhook error:', error);
    res.status(400).json({ error: 'Webhook processing failed' });
  }
});

// Add health check before Apollo setup
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'Sticker Shuttle API',
    environment: process.env.NODE_ENV || 'development',
    easypostConfigured: easyPostClient.isReady() // Added EasyPost status check
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

// Add EasyPost diagnostic endpoint
app.get('/easypost/status', (req, res) => {
  const diagnostics = {
    easypost_configured: easyPostClient.isReady(),
    easypost_test_mode: easyPostClient.isTestMode(),
    easypost_api_key_set: !!process.env.EASYPOST_API_KEY,
    easypost_api_key_prefix: process.env.EASYPOST_API_KEY ? process.env.EASYPOST_API_KEY.substring(0, 8) + '...' : 'NOT SET',
    easypost_test_mode_env: process.env.EASYPOST_TEST_MODE,
    node_env: process.env.NODE_ENV,
    timestamp: new Date().toISOString()
  };

  // Try to check if we can reinitialize
  if (!easyPostClient.isReady() && process.env.EASYPOST_API_KEY) {
    console.log('🔄 EasyPost not ready, attempting reinit from status endpoint...');
    easyPostClient.init();
    diagnostics.reinit_attempted = true;
    diagnostics.reinit_result = easyPostClient.isReady();
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
    getOrderByNumber(orderNumber: String!): CustomerOrder
    claimGuestOrders(userId: ID!, email: String!): ClaimResult
    getAllOrders: [CustomerOrder]
    getAllCustomers: [Customer!]!
    getAnalyticsData(timeRange: String): AnalyticsData
    
    # Review queries
    getProductReviews(productId: String!, limit: Int, offset: Int): [Review!]!
    getProductReviewStats(productId: String!): ReviewStats!
    canUserReviewProduct(userId: ID!, productId: String!): Boolean!
    getUserReviews(userId: ID!): [Review!]!
    
    # Order Review Queries
    getOrderReview(orderId: ID!): Review
    canUserReviewOrder(userId: ID!, orderId: ID!): Boolean!
    
    # Discount queries
    validateDiscountCode(code: String!, orderAmount: Float!): DiscountValidation!
    getAllDiscountCodes: [DiscountCode!]!
    getDiscountCodeStats(codeId: ID!): DiscountCodeStats!
    
    # Credit queries
    getUserCreditBalance(userId: String!): CreditBalance!
    getUnreadCreditNotifications(userId: String!): [CreditNotification!]!
    getAllCreditTransactions(limit: Int, offset: Int): CreditTransactionList!
    getUserCreditHistory(userId: String!): UserCreditHistory!
    
    # User queries
    getAllUsers: [User!]!
  }

  type Mutation {
    # Customer order mutations
    createCustomerOrder(input: CustomerOrderInput!): CustomerOrder
    updateOrderStatus(orderId: String!, statusUpdate: OrderStatusInput!): CustomerOrder
    claimGuestOrders(userId: ID!, email: String!): ClaimResult
    
    # Proof mutations
    addOrderProof(orderId: ID!, proofData: OrderProofInput!): CustomerOrder
    updateProofStatus(orderId: ID!, proofId: ID!, status: String!, customerNotes: String): CustomerOrder
    replaceProofFile(orderId: ID!, proofId: ID!, newProofData: OrderProofInput!): CustomerOrder
    updateProofFileByCustomer(orderId: ID!, proofId: ID!, newFileUrl: String!, originalFileName: String): CustomerOrder
    updateOrderFileByCustomer(orderId: ID!, newFileUrl: String!, originalFileName: String): CustomerOrder
    removeProof(orderId: ID!, proofId: ID!): CustomerOrder
    
    # Review mutations
    createReview(input: CreateReviewInput!): Review!
    updateReview(reviewId: ID!, input: UpdateReviewInput!): Review!
    deleteReview(reviewId: ID!): Boolean!
    voteOnReview(reviewId: ID!, isHelpful: Boolean!): Review!
    
    # Order Review Mutations
    createOrderReview(input: CreateOrderReviewInput!): Review!
    updateOrderReview(reviewId: ID!, input: UpdateOrderReviewInput!): Review!
    deleteOrderReview(reviewId: ID!): Boolean!
    
    # EasyPost tracking mutations
    createEasyPostTracker(trackingCode: String!, orderId: ID!, carrier: String): TrackingResult
    refreshOrderTracking(orderId: ID!): TrackingResult
    refreshAllActiveTracking: BatchTrackingResult
    addProofNotes(orderId: ID!, proofId: ID!, adminNotes: String, customerNotes: String): CustomerOrder
    approveProof(orderId: ID!, proofId: ID!, adminNotes: String): CustomerOrder
    requestProofChanges(orderId: ID!, proofId: ID!, adminNotes: String!): CustomerOrder
    sendProofs(orderId: ID!): CustomerOrder
    
    # Stripe mutations
    createStripeCheckoutSession(input: StripeCheckoutInput!): StripeCheckoutResult
    processStripeCartOrder(input: CartOrderInput!): StripeOrderProcessResult
    
    # EasyPost shipping mutations
    createEasyPostShipment(orderId: ID!, packageDimensions: PackageDimensionsInput): EasyPostShipmentResult
    buyEasyPostLabel(shipmentId: String!, rateId: String!, orderId: String!, insurance: String): EasyPostLabelResult
    trackEasyPostShipment(trackingCode: String!): EasyPostTrackingResult
    
    # Manual tracking update mutation
    updateOrderTracking(orderId: ID!): CustomerOrder
    
    # Discount mutations
    createDiscountCode(input: CreateDiscountCodeInput!): DiscountCode!
    updateDiscountCode(id: ID!, input: UpdateDiscountCodeInput!): DiscountCode!
    deleteDiscountCode(id: ID!): Boolean!
    applyDiscountToCheckout(code: String!, orderAmount: Float!): DiscountValidation!
    
    # Credit mutations
    markCreditNotificationsRead(userId: String!): MutationResult!
    addUserCredits(input: AddUserCreditsInput!): AddUserCreditsResult!
    addCreditsToAllUsers(amount: Float!, reason: String!): AddCreditsToAllUsersResult!
    applyCreditsToOrder(orderId: String!, amount: Float!): ApplyCreditsResult!
  }

  type Customer {
    id: ID!
    email: String!
    firstName: String
    lastName: String
    city: String
    state: String
    country: String
    totalOrders: Int!
    totalSpent: Float!
    averageOrderValue: Float!
    marketingOptIn: Boolean!
    lastOrderDate: String
    firstOrderDate: String
    orders: [CustomerOrder!]!
  }

  type User {
    id: ID!
    email: String!
    firstName: String
    lastName: String
    company: String
    createdAt: String!
    lastSignIn: String
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

  # Review Types
  type Review {
    id: ID!
    userId: ID!
    productId: String!
    productCategory: String!
    rating: Int!
    title: String
    comment: String
    isVerifiedPurchase: Boolean!
    orderId: ID
    helpfulVotes: Int!
    totalVotes: Int!
    status: String!
    createdAt: String!
    updatedAt: String!
    userEmail: String
    userFirstName: String
    userLastName: String
    userDisplayName: String
  }

  type ReviewStats {
    totalReviews: Int!
    averageRating: Float!
    rating5Count: Int!
    rating4Count: Int!
    rating3Count: Int!
    rating2Count: Int!
    rating1Count: Int!
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
    proofs: [OrderProof]
    proof_status: String
    proof_sent_at: String
    proof_link: String
    discountCode: String
    discountAmount: Float
  }

  type OrderProof {
    id: ID!
    orderId: ID!
    proofUrl: String!
    proofPublicId: String!
    proofTitle: String
    uploadedAt: String
    uploadedBy: String
    status: String
    customerNotes: String
    adminNotes: String
    replaced: Boolean
    replacedAt: String
    originalFileName: String
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
    customerReplacementFile: String
    customerReplacementFileName: String
    customerReplacementAt: String
  }

  type ClaimResult {
    success: Boolean!
    claimedOrdersCount: Int!
    message: String
  }

  type TrackingResult {
    success: Boolean!
    message: String!
    trackingCode: String
    status: String
    carrier: String
    publicUrl: String
    estDeliveryDate: String
  }

  type BatchTrackingResult {
    success: Boolean!
    message: String!
    processedCount: Int!
    errors: [String!]
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
    discountCode: String
    discountAmount: Float
    creditsToApply: Float
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

  input PackageDimensionsInput {
    length: Float!
    width: Float!
    height: Float!
    weight: Float!
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
    creditsApplied: Float
    remainingCredits: Float
  }

  # EasyPost Types
  type EasyPostShipmentResult {
    success: Boolean!
    shipment: EasyPostShipment
    error: String
  }

  type EasyPostShipment {
    id: String!
    rates: [EasyPostRate!]!
    to_address: EasyPostAddress
    from_address: EasyPostAddress
    parcel: EasyPostParcel
    reference: String
  }

  type EasyPostRate {
    id: String!
    carrier: String!
    service: String!
    rate: String!
    currency: String!
    delivery_days: Int
    delivery_date: String
    delivery_date_guaranteed: Boolean
  }

  type EasyPostAddress {
    name: String
    company: String
    street1: String
    street2: String
    city: String
    state: String
    zip: String
    country: String
    phone: String
    email: String
  }

  type EasyPostParcel {
    length: Float
    width: Float
    height: Float
    weight: Float
  }

  type EasyPostLabelResult {
    success: Boolean!
    shipment: EasyPostPurchasedShipment
    error: String
  }

  type EasyPostPurchasedShipment {
    id: String!
    tracking_code: String
    postage_label: EasyPostLabel
    selected_rate: EasyPostRate
    tracker: EasyPostTracker
  }

  type EasyPostLabel {
    id: String!
    label_url: String!
    label_file_type: String
    label_size: String
  }

  type EasyPostTracker {
    id: String!
    tracking_code: String!
    carrier: String!
    public_url: String
    status: String
    est_delivery_date: String
  }

  type EasyPostTrackingResult {
    success: Boolean!
    tracker: EasyPostTracker
    error: String
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

  input OrderProofInput {
    proofUrl: String!
    proofPublicId: String!
    proofTitle: String
    adminNotes: String
  }

  # Review Input Types
  input CreateReviewInput {
    productId: String!
    productCategory: String!
    rating: Int!
    title: String
    comment: String
  }

  input UpdateReviewInput {
    rating: Int
    title: String
    comment: String
  }
  
  input CreateOrderReviewInput {
    orderId: ID!
    rating: Int!
    title: String
    comment: String
  }
  
  input UpdateOrderReviewInput {
    rating: Int
    title: String
    comment: String
  }

  type AnalyticsData {
    summary: SummaryMetrics
    dailySales: [DailySalesData]
    proofMetrics: ProofMetrics
    productPerformance: ProductPerformance
  }

  type SummaryMetrics {
    totalRevenue: Float
    totalOrders: Int
    averageOrderValue: Float
    uniqueCustomers: Int
    revenueGrowth: Float
    conversionRate: Float
  }

  type DailySalesData {
    date: String
    revenue: Float
    orders: Int
    averageOrderValue: Float
  }

  type ProofMetrics {
    avgProofSendTime: Float
    avgProofAcceptTime: Float
    proofApprovalRate: Float
    proofChangesRate: Float
    totalProofs: Int
    proofsApproved: Int
    proofsWithChanges: Int
  }

  type ProductPerformance {
    topProductsByRevenue: [ProductStats]
  }

  type ProductStats {
    name: String
    revenue: Float
    quantity: Int
    orders: Int
  }

  # Discount Types
  type DiscountCode {
    id: ID!
    code: String!
    description: String
    discountType: String!
    discountValue: Float!
    minimumOrderAmount: Float
    usageLimit: Int
    usageCount: Int!
    validFrom: String!
    validUntil: String
    active: Boolean!
    createdAt: String!
    updatedAt: String!
  }

  type DiscountValidation {
    valid: Boolean!
    discountCode: DiscountCode
    discountAmount: Float
    message: String
  }

  type DiscountCodeStats {
    totalUsage: Int!
    totalDiscountGiven: Float!
    averageOrderValue: Float!
    recentUsage: [DiscountUsage!]!
  }

  type DiscountUsage {
    id: ID!
    orderId: ID!
    userId: ID
    guestEmail: String
    usedAt: String!
    discountAmount: Float!
  }

  input CreateDiscountCodeInput {
    code: String!
    description: String
    discountType: String!
    discountValue: Float!
    minimumOrderAmount: Float
    usageLimit: Int
    validFrom: String
    validUntil: String
    active: Boolean
  }

  input UpdateDiscountCodeInput {
    description: String
    discountType: String
    discountValue: Float
    minimumOrderAmount: Float
    usageLimit: Int
    validFrom: String
    validUntil: String
    active: Boolean
  }
  
  # Credit Types
  type CreditBalance {
    balance: Float!
    transactionCount: Int!
    lastTransactionDate: String
  }
  
  type CreditNotification {
    id: String!
    creditId: String!
    amount: Float!
    reason: String
    createdAt: String!
  }
  
  type CreditTransaction {
    id: String!
    userId: String!
    userEmail: String!
    userName: String!
    amount: Float!
    balance: Float!
    reason: String
    transactionType: String!
    orderId: String
    orderNumber: String
    createdAt: String!
    createdBy: String
    expiresAt: String
  }
  
  type CreditTransactionList {
    transactions: [CreditTransaction!]!
    totalCount: Int!
  }
  
  type UserCreditHistory {
    transactions: [CreditTransaction!]!
    currentBalance: Float!
  }
  
  type MutationResult {
    success: Boolean!
  }
  
  type AddUserCreditsResult {
    success: Boolean!
    credit: CreditTransaction
    error: String
  }
  
  type AddCreditsToAllUsersResult {
    success: Boolean!
    usersUpdated: Int
    error: String
  }
  
  type ApplyCreditsResult {
    success: Boolean!
    remainingBalance: Float
    error: String
  }
  
  input AddUserCreditsInput {
    userId: String!
    amount: Float!
    reason: String
    expiresAt: String
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
    updatedAt: (parent) => parent.updated_at || parent.updatedAt,
    proofs: (parent) => parent.proofs || [],
    proof_status: (parent) => parent.proof_status || parent.proofStatus,
    proof_sent_at: (parent) => parent.proof_sent_at || parent.proofSentAt,
    proof_link: (parent) => parent.proof_link || parent.proofLink,
    discountCode: (parent) => parent.discount_code || parent.discountCode,
    discountAmount: (parent) => parent.discount_amount || parent.discountAmount
  },

  OrderItem: {
    customerOrderId: (parent) => parent.order_id || parent.customerOrderId,
    customerReplacementFile: (parent) => parent.customer_replacement_file || parent.customerReplacementFile,
    customerReplacementFileName: (parent) => parent.customer_replacement_file_name || parent.customerReplacementFileName,
    customerReplacementAt: (parent) => parent.customer_replacement_at || parent.customerReplacementAt,
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

  OrderProof: {
    orderId: (parent) => parent.orderId || parent.order_id,
    proofUrl: (parent) => parent.proofUrl || parent.proof_url,
    proofPublicId: (parent) => parent.proofPublicId || parent.proof_public_id,
    proofTitle: (parent) => parent.proofTitle || parent.proof_title,
    uploadedAt: (parent) => parent.uploadedAt || parent.uploaded_at,
    uploadedBy: (parent) => parent.uploadedBy || parent.uploaded_by,
    customerNotes: (parent) => parent.customerNotes || parent.customer_notes,
    adminNotes: (parent) => parent.adminNotes || parent.admin_notes
  },

  Review: {
    userId: (parent) => parent.user_id || parent.userId,
    productId: (parent) => parent.product_id || parent.productId,
    productCategory: (parent) => parent.product_category || parent.productCategory,
    isVerifiedPurchase: (parent) => parent.is_verified_purchase || parent.isVerifiedPurchase,
    orderId: (parent) => parent.order_id || parent.orderId,
    helpfulVotes: (parent) => parent.helpful_votes || parent.helpfulVotes,
    totalVotes: (parent) => parent.total_votes || parent.totalVotes,
    createdAt: (parent) => parent.created_at || parent.createdAt,
    updatedAt: (parent) => parent.updated_at || parent.updatedAt,
    userEmail: (parent) => parent.user_email || parent.userEmail,
    userFirstName: (parent) => parent.user_first_name || parent.userFirstName,
    userLastName: (parent) => parent.user_last_name || parent.userLastName,
    userDisplayName: (parent) => parent.user_display_name || parent.userDisplayName
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
        
        // Fetch proof data for all orders since RPC doesn't include it
        const client = supabaseClient.getServiceClient();
        const orderIds = paidOrders.map(order => order.order_id);
        
        let proofsData = {};
        if (orderIds.length > 0) {
          const { data: ordersWithProofs, error: proofsError } = await client
            .from('orders_main')
            .select('id, proofs, proof_status, proof_sent_at, proof_link')
            .in('id', orderIds);
            
          if (proofsError) {
            console.error('❌ Error fetching proof data:', proofsError);
          } else {
            // Create lookup map for proof data
            proofsData = ordersWithProofs.reduce((acc, order) => {
              acc[order.id] = {
                proofs: order.proofs || [],
                proof_status: order.proof_status,
                proof_sent_at: order.proof_sent_at,
                proof_link: order.proof_link
              };
              return acc;
            }, {});
            console.log('🔍 Proof data fetched for', Object.keys(proofsData).length, 'orders');
          }
        }
        
        // Debug: Log the first order's items to see the actual structure
        if (paidOrders.length > 0 && paidOrders[0].items) {
          console.log('🔍 First paid order items structure:', JSON.stringify(paidOrders[0].items, null, 2));
        }
        
        // Map RPC function results to match GraphQL schema expectations (camelCase field names)
        const ordersWithTracking = await Promise.all(paidOrders.map(async order => {
          // Get proof data for this order
          const orderProofData = proofsData[order.order_id] || {
            proofs: [],
            proof_status: null,
            proof_sent_at: null,
            proof_link: null
          };
          
          // Fetch tracking data separately for each order
          let trackingData = {
            tracking_number: null,
            tracking_company: null,
            tracking_url: null
          };
          
          try {
            const { data: trackingInfo, error: trackingError } = await client
              .from('orders_main')
              .select('tracking_number, tracking_company, tracking_url')
              .eq('id', order.order_id)
              .single();
              
            if (!trackingError && trackingInfo) {
              trackingData = trackingInfo;
              console.log(`📦 Tracking data for order ${order.order_id}:`, trackingData);
            }
          } catch (err) {
            console.log(`⚠️ Could not fetch tracking for order ${order.order_id}`);
          }
          
          // Calculate order total from items since RPC doesn't provide order-level total
          const calculatedTotal = (order.items || []).reduce((sum, item) => {
            const itemTotal = Number(item.total_price) || 0;
            return sum + itemTotal;
          }, 0);
          
          console.log(`🔍 Order ${order.order_id} calculated total: ${calculatedTotal} from ${order.items?.length || 0} items`);
          console.log(`🔍 Order ${order.order_id} proof data:`, {
            hasProofs: orderProofData.proofs.length > 0,
            proofsCount: orderProofData.proofs.length,
            proof_status: orderProofData.proof_status,
            proof_sent_at: orderProofData.proof_sent_at
          });
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
            orderNumber: order.order_number || null, // Get order_number from RPC
            orderStatus: order.order_status || 'Processing',
            fulfillmentStatus: order.fulfillment_status || 'unfulfilled',
            financialStatus: order.financial_status || 'pending',
            trackingNumber: trackingData.tracking_number || null, // Use fetched tracking data
            trackingCompany: trackingData.tracking_company || null,
            trackingUrl: trackingData.tracking_url || null,
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
            // Add proof-related fields
            proofs: orderProofData.proofs || [], // Include proofs array from fetched data
            proof_status: orderProofData.proof_status || null, // Include proof status
            proof_sent_at: orderProofData.proof_sent_at || null, // Include proof sent timestamp
            proof_link: orderProofData.proof_link || null, // Include proof link
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
        }));
        
        return ordersWithTracking;
      } catch (error) {
        console.error('Error fetching user orders:', error);
        throw new Error(error.message);
      }
    },

    // Get order by number resolver
    getOrderByNumber: async (_, { orderNumber }) => {
      try {
        console.log('🔍 getOrderByNumber called with orderNumber:', orderNumber);
        
        if (!supabaseClient.isReady()) {
          throw new Error('Supabase client not ready');
        }

        const client = supabaseClient.getServiceClient();
        const { data: orders, error } = await client
          .from('orders_main')
          .select(`
            *,
            items:order_items_new(*)
          `)
          .eq('order_number', orderNumber)
          .single();

        if (error) {
          console.error('❌ Error fetching order by number:', error);
          throw new Error(`Failed to fetch order: ${error.message}`);
        }

        if (!orders) {
          console.log('❌ No order found with orderNumber:', orderNumber);
          return null;
        }

        console.log('✅ Order found:', orders);
        
        // Map the order to match GraphQL schema (same as getAllOrders)
        return {
          id: String(orders.id),
          userId: orders.user_id ? String(orders.user_id) : null,
          guestEmail: orders.guest_email,
          stripePaymentIntentId: orders.stripe_payment_intent_id,
          stripeCheckoutSessionId: orders.stripe_session_id,
          orderNumber: orders.order_number,
          orderStatus: orders.order_status || 'Processing',
          fulfillmentStatus: orders.fulfillment_status || 'unfulfilled',
          financialStatus: orders.financial_status || 'pending',
          trackingNumber: orders.tracking_number,
          trackingCompany: orders.tracking_company,
          trackingUrl: orders.tracking_url,
          subtotalPrice: Number(orders.subtotal_price) || 0,
          totalTax: Number(orders.total_tax) || 0,
          totalPrice: Number(orders.total_price) || 0,
          currency: orders.currency || 'USD',
          customerFirstName: orders.customer_first_name,
          customerLastName: orders.customer_last_name,
          customerEmail: orders.customer_email,
          customerPhone: orders.customer_phone,
          shippingAddress: orders.shipping_address,
          billingAddress: orders.billing_address,
          orderTags: orders.order_tags,
          orderNote: orders.order_note,
          orderCreatedAt: orders.order_created_at,
          orderUpdatedAt: orders.order_updated_at,
          createdAt: orders.created_at,
          updatedAt: orders.updated_at,
          proof_status: orders.proof_status,
          proof_sent_at: orders.proof_sent_at,
          proof_link: orders.proof_link,
          proofs: orders.proofs || [],
          // Map items
          items: (orders.items || []).map(item => ({
            id: String(item.id),
            customerOrderId: String(orders.id),
            stripeLineItemId: item.stripe_line_item_id,
            productId: String(item.product_id || 'custom-product'),
            productName: String(item.product_name || 'Custom Product'),
            productCategory: item.product_category,
            sku: item.sku,
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unit_price) || 0,
            totalPrice: Number(item.total_price) || 0,
            calculatorSelections: item.calculator_selections || {},
            customFiles: Array.isArray(item.custom_files) ? item.custom_files : [],
            customerNotes: item.customer_notes,
            instagramHandle: item.instagram_handle,
            instagramOptIn: item.instagram_opt_in,
            fulfillmentStatus: item.fulfillment_status,
            createdAt: item.created_at,
            updatedAt: item.updated_at
          }))
        };
      } catch (error) {
        console.error('❌ getOrderByNumber error:', error);
        throw error;
      }
    },

    getOrderById: async (_, { id }) => {
      try {
        console.log('🔍 getOrderById called with id:', id);
        
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

        console.log('📦 Order fetched:', {
          id: data.id,
          proofs: data.proofs || [],
          proof_status: data.proof_status
        });

        // Return the order with proofs array (it's a JSONB column in the orders_main table)
        return {
          ...data,
          proofs: data.proofs || []
        };
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

    getAllOrders: async () => {
      try {
        console.log('🔍 getAllOrders called - Admin fetching all orders');
        
        if (!supabaseClient.isReady()) {
          console.error('❌ Supabase client not ready');
          throw new Error('Order service is currently unavailable');
        }
        
        const client = supabaseClient.getServiceClient();
        
        // Fetch all orders with their items
        const { data: orders, error } = await client
          .from('orders_main')
          .select(`
            *,
            items:order_items_new(*)
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.error('❌ Error fetching all orders:', error);
          throw new Error('Failed to fetch orders');
        }

        console.log(`📊 Found ${orders?.length || 0} total orders`);

        // Map the orders to match GraphQL schema
        return (orders || []).map(order => ({
          id: String(order.id),
          userId: order.user_id ? String(order.user_id) : null,
          guestEmail: order.guest_email,
          stripePaymentIntentId: order.stripe_payment_intent_id,
          stripeCheckoutSessionId: order.stripe_session_id,
          orderNumber: order.order_number,
          orderStatus: order.order_status || 'Processing',
          fulfillmentStatus: order.fulfillment_status || 'unfulfilled',
          financialStatus: order.financial_status || 'pending',
          trackingNumber: order.tracking_number,
          trackingCompany: order.tracking_company,
          trackingUrl: order.tracking_url,
          subtotalPrice: Number(order.subtotal_price) || 0,
          totalTax: Number(order.total_tax) || 0,
          totalPrice: Number(order.total_price) || 0,
          currency: order.currency || 'USD',
          customerFirstName: order.customer_first_name,
          customerLastName: order.customer_last_name,
          customerEmail: order.customer_email,
          customerPhone: order.customer_phone,
          shippingAddress: order.shipping_address,
          billingAddress: order.billing_address,
          orderTags: order.order_tags,
          orderNote: order.order_note,
          orderCreatedAt: order.order_created_at,
          orderUpdatedAt: order.order_updated_at,
          createdAt: order.created_at,
          updatedAt: order.updated_at,
          proof_status: order.proof_status,
          proof_sent_at: order.proof_sent_at,
          proof_link: order.proof_link,
          proofs: order.proofs || [],
          // Map items
          items: (order.items || []).map(item => ({
            id: String(item.id),
            customerOrderId: String(order.id),
            stripeLineItemId: item.stripe_line_item_id,
            productId: String(item.product_id || 'custom-product'),
            productName: String(item.product_name || 'Custom Product'),
            productCategory: item.product_category,
            sku: item.sku,
            quantity: Number(item.quantity) || 1,
            unitPrice: Number(item.unit_price) || 0,
            totalPrice: Number(item.total_price) || 0,
            calculatorSelections: item.calculator_selections || {},
            customFiles: Array.isArray(item.custom_files) ? item.custom_files : [],
            customerNotes: item.customer_notes,
            instagramHandle: item.instagram_handle,
            instagramOptIn: item.instagram_opt_in,
            fulfillmentStatus: item.fulfillment_status,
            createdAt: item.created_at,
            updatedAt: item.updated_at
          }))
        }));
      } catch (error) {
        console.error('❌ Error in getAllOrders:', error);
        throw new Error(error.message);
      }
    },

    getAllCustomers: async (parent, args, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        // Get all orders from orders_main with items
        const client = supabaseClient.getServiceClient();
        const { data: orders, error } = await client
          .from('orders_main')
          .select(`
            *,
            order_items_new(*)
          `)
          .order('order_created_at', { ascending: false });

        if (error) throw error;

        // Group orders by customer email
        const customerMap = new Map();

        orders.forEach(order => {
          const email = order.customer_email?.toLowerCase();
          if (!email) return;

          if (!customerMap.has(email)) {
            customerMap.set(email, {
              id: email, // Use email as ID for now
              email: order.customer_email,
              firstName: order.customer_first_name,
              lastName: order.customer_last_name,
              city: order.shipping_address?.city || '',
              state: order.shipping_address?.province || order.shipping_address?.state || '',
              country: order.shipping_address?.country || 'US',
              totalOrders: 0,
              totalSpent: 0,
              marketingOptIn: false,
              orders: [],
              lastOrderDate: null,
              firstOrderDate: null
            });
          }

          const customer = customerMap.get(email);
          
          // Only include paid orders in customer statistics
          if (order.financial_status === 'paid') {
            customer.totalOrders += 1;
            customer.totalSpent += Number(order.total_price) || 0;
          }
          
          // Check marketing opt-in from any order item
          if (order.order_items_new) {
            order.order_items_new.forEach(item => {
              if (item.instagram_opt_in) {
                customer.marketingOptIn = true;
              }
            });
          }

          // Track order dates
          const orderDate = order.order_created_at || order.created_at;
          if (!customer.firstOrderDate || new Date(orderDate) < new Date(customer.firstOrderDate)) {
            customer.firstOrderDate = orderDate;
          }
          if (!customer.lastOrderDate || new Date(orderDate) > new Date(customer.lastOrderDate)) {
            customer.lastOrderDate = orderDate;
          }

          // Update location from most recent order
          if (order.shipping_address) {
            customer.city = order.shipping_address.city || customer.city;
            customer.state = order.shipping_address.province || order.shipping_address.state || customer.state;
            customer.country = order.shipping_address.country || customer.country;
          }

          customer.orders.push(order);
        });

        // Convert to array and calculate averages
        const customers = Array.from(customerMap.values()).map(customer => ({
          ...customer,
          averageOrderValue: customer.totalOrders > 0 ? customer.totalSpent / customer.totalOrders : 0
        }));

        return customers;
      } catch (error) {
        console.error('Error fetching customers:', error);
        throw new Error('Failed to fetch customers');
      }
    },

    // Analytics query with time-series data
    getAnalyticsData: async (_, { timeRange = '30d' }, context) => {
      try {
        const client = supabaseClient.getServiceClient();
        const { data: allOrders, error } = await client
          .from('orders_main')
          .select(`
            *,
            order_items_new(*)
          `)
          .order('order_created_at', { ascending: true });

        if (error) throw error;

        const orders = allOrders || [];
        
        // Calculate date range
        const now = new Date();
        let startDate = new Date();
        
        
        switch (timeRange) {
          case '7d':
            startDate.setDate(now.getDate() - 7);
            break;
          case '30d':
            startDate.setDate(now.getDate() - 30);
            break;
          case '90d':
            startDate.setDate(now.getDate() - 90);
            break;
          case '1y':
            startDate.setFullYear(now.getFullYear() - 1);
            break;
          default:
            startDate.setDate(now.getDate() - 30);
        }

        // Filter orders by date range and paid status only
        const filteredOrders = orders.filter(order => {
          const orderDate = new Date(order.order_created_at || order.created_at);
          return orderDate >= startDate && order.financial_status === 'paid';
        });

        // Calculate daily sales data
        const dailySalesMap = new Map();
        const dailyOrdersMap = new Map();
        
        filteredOrders.forEach(order => {
          const date = new Date(order.order_created_at || order.created_at).toISOString().split('T')[0];
          
          // Daily sales
          if (!dailySalesMap.has(date)) {
            dailySalesMap.set(date, 0);
            dailyOrdersMap.set(date, 0);
          }
          dailySalesMap.set(date, dailySalesMap.get(date) + (order.total_price || 0));
          dailyOrdersMap.set(date, dailyOrdersMap.get(date) + 1);
        });

        // Prepare daily sales data for chart
        const dailySales = Array.from(dailySalesMap.entries())
          .map(([date, revenue]) => ({
            date,
            revenue,
            orders: dailyOrdersMap.get(date),
            averageOrderValue: revenue / dailyOrdersMap.get(date)
          }))
          .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // Calculate unique customers
        const uniqueCustomers = new Set(filteredOrders.map(o => o.customer_email)).size;

        // Calculate proof metrics
        let totalProofSendTime = 0;
        let proofSendCount = 0;
        let totalProofAcceptTime = 0;
        let proofAcceptCount = 0;
        let proofsApproved = 0;
        let proofsWithChanges = 0;
        let totalProofs = 0;

        filteredOrders.forEach(order => {
          if (order.proofs && order.proofs.length > 0) {
            // Time to send proof (order created to proof sent)
            if (order.proof_sent_at) {
              const orderDate = new Date(order.order_created_at || order.created_at);
              const proofSentDate = new Date(order.proof_sent_at);
              const hoursDiff = (proofSentDate.getTime() - orderDate.getTime()) / (1000 * 60 * 60);
              if (hoursDiff > 0 && hoursDiff < 720) { // Exclude outliers over 30 days
                totalProofSendTime += hoursDiff;
                proofSendCount++;
              }
            }

            // Analyze each proof
            order.proofs.forEach(proof => {
              totalProofs++;
              
              // Time to accept/respond to proof
              if (proof.sentAt && (proof.approvedAt || proof.updatedAt)) {
                const sentDate = new Date(proof.sentAt);
                const responseDate = new Date(proof.approvedAt || proof.updatedAt);
                const hoursDiff = (responseDate.getTime() - sentDate.getTime()) / (1000 * 60 * 60);
                if (hoursDiff > 0 && hoursDiff < 720) { // Exclude outliers over 30 days
                  totalProofAcceptTime += hoursDiff;
                  proofAcceptCount++;
                }
              }

              // Count approvals vs changes
              if (proof.status === 'approved') {
                proofsApproved++;
              } else if (proof.status === 'changes_requested') {
                proofsWithChanges++;
              }
            });
          }
        });

        const avgProofSendTime = proofSendCount > 0 ? totalProofSendTime / proofSendCount : 0;
        const avgProofAcceptTime = proofAcceptCount > 0 ? totalProofAcceptTime / proofAcceptCount : 0;
        const proofApprovalRate = totalProofs > 0 ? (proofsApproved / totalProofs) * 100 : 0;
        const proofChangesRate = totalProofs > 0 ? (proofsWithChanges / totalProofs) * 100 : 0;

        // Product performance
        const productStatsMap = new Map();
        
        filteredOrders.forEach(order => {
          const items = order.order_items_new || [];
          items.forEach(item => {
            const productName = item.product_name || 'Unknown';
            if (!productStatsMap.has(productName)) {
              productStatsMap.set(productName, { revenue: 0, quantity: 0, orders: 0 });
            }
            const stats = productStatsMap.get(productName);
            stats.revenue += item.total_price || 0;
            stats.quantity += item.quantity || 0;
            stats.orders += 1;
          });
        });

        const topProductsByRevenue = Array.from(productStatsMap.entries())
          .map(([name, stats]) => ({ name, ...stats }))
          .sort((a, b) => b.revenue - a.revenue)
          .slice(0, 5);



        // Summary metrics
        const totalRevenue = filteredOrders.reduce((sum, order) => sum + (order.total_price || 0), 0);
        const totalOrders = filteredOrders.length;
        const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

        // Growth metrics (compare to previous period)
        const previousPeriodStart = new Date(startDate);
        const periodLength = now.getTime() - startDate.getTime();
        previousPeriodStart.setTime(previousPeriodStart.getTime() - periodLength);

        const previousPeriodOrders = orders.filter(order => {
          const orderDate = new Date(order.order_created_at || order.created_at);
          return orderDate >= previousPeriodStart && orderDate < startDate && order.financial_status === 'paid';
        });

        const previousRevenue = previousPeriodOrders.reduce((sum, order) => sum + (order.total_price || 0), 0);
        const revenueGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

        return {
          summary: {
            totalRevenue,
            totalOrders,
            averageOrderValue,
            uniqueCustomers,
            revenueGrowth,
            conversionRate: 2.9 // This would need actual visitor data
          },
          dailySales,
          proofMetrics: {
            avgProofSendTime, // in hours
            avgProofAcceptTime, // in hours
            proofApprovalRate,
            proofChangesRate,
            totalProofs,
            proofsApproved,
            proofsWithChanges
          },
          productPerformance: {
            topProductsByRevenue
          }
        };
      } catch (error) {
        console.error('Error fetching analytics data:', error);
        throw new Error('Failed to fetch analytics data');
      }
    },

    // Review Queries
    getProductReviews: async (_, { productId, limit = 50, offset = 0 }) => {
      try {
        const client = supabaseClient.getServiceClient();
        const { data, error } = await client
          .rpc('get_product_reviews', { 
            p_product_id: productId, 
            p_limit: limit, 
            p_offset: offset 
          });

        if (error) {
          console.error('Error fetching product reviews:', error);
          throw new Error('Failed to fetch product reviews');
        }

        return data || [];
      } catch (error) {
        console.error('Error in getProductReviews:', error);
        throw new Error(error.message);
      }
    },

    getProductReviewStats: async (_, { productId }) => {
      try {
        const client = supabaseClient.getServiceClient();
        const { data, error } = await client
          .rpc('get_product_review_stats', { p_product_id: productId });

        if (error) {
          console.error('Error fetching product review stats:', error);
          throw new Error('Failed to fetch product review stats');
        }

        // If no reviews exist, return zero stats
        if (!data || data.length === 0) {
          return {
            totalReviews: 0,
            averageRating: 0,
            rating5Count: 0,
            rating4Count: 0,
            rating3Count: 0,
            rating2Count: 0,
            rating1Count: 0
          };
        }

        return data[0];
      } catch (error) {
        console.error('Error in getProductReviewStats:', error);
        throw new Error(error.message);
      }
    },

    canUserReviewProduct: async (_, { userId, productId }, context) => {
      const { user } = context;
      if (!user) {
        return false;
      }

      try {
        const client = supabaseClient.getServiceClient();
        const { data, error } = await client
          .rpc('can_user_review_product', { 
            p_user_id: userId, 
            p_product_id: productId 
          });

        if (error) {
          console.error('Error checking if user can review product:', error);
          return false;
        }

        return data || false;
      } catch (error) {
        console.error('Error in canUserReviewProduct:', error);
        return false;
      }
    },

    getUserReviews: async (_, { userId }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        const client = supabaseClient.getServiceClient();
        const { data, error } = await client
          .from('reviews')
          .select(`
            *,
            auth.users!inner(email)
          `)
          .eq('user_id', userId)
          .eq('status', 'active')
          .order('created_at', { ascending: false });

        if (error) {
          console.error('Error fetching user reviews:', error);
          throw new Error('Failed to fetch user reviews');
        }

        return data || [];
      } catch (error) {
        console.error('Error in getUserReviews:', error);
        throw new Error(error.message);
      }
    },

    // Order Review Queries
    getOrderReview: async (_, { orderId }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        const client = supabaseClient.getServiceClient();
        
        // Check if user owns the order
        const { data: order, error: orderError } = await client
          .from('orders_main')
          .select('id, user_id')
          .eq('id', orderId)
          .eq('user_id', user.id)
          .single();

        if (orderError) {
          throw new Error('Order not found or access denied');
        }

        // Get the review for this order
        const { data: review, error: reviewError } = await client
          .from('reviews')
          .select(`
            *,
            auth.users!inner(email)
          `)
          .eq('order_id', orderId)
          .eq('user_id', user.id)
          .single();

        if (reviewError && reviewError.code !== 'PGRST116') {
          console.error('Error fetching order review:', reviewError);
          throw new Error('Failed to fetch review');
        }

        if (!review) {
          return null;
        }

        return {
          ...review,
          userEmail: review.users?.email || user.email,
          userFirstName: user.user_metadata?.first_name || '',
          userLastName: user.user_metadata?.last_name || '',
          userDisplayName: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || 'Anonymous User'
        };
      } catch (error) {
        console.error('Error in getOrderReview:', error);
        throw new Error(error.message);
      }
    },

    canUserReviewOrder: async (_, { userId, orderId }) => {
      try {
        const client = supabaseClient.getServiceClient();
        
        // Check if order exists and belongs to user
        const { data: order, error: orderError } = await client
          .from('orders_main')
          .select('id, user_id, financial_status')
          .eq('id', orderId)
          .eq('user_id', userId)
          .single();

        if (orderError) {
          return false;
        }

        // Only allow reviews for paid orders
        if (order.financial_status !== 'paid') {
          return false;
        }

        // Check if user has already reviewed this order
        const { data: existingReview, error: reviewError } = await client
          .from('reviews')
          .select('id')
          .eq('user_id', userId)
          .eq('order_id', orderId)
          .single();

        if (reviewError && reviewError.code !== 'PGRST116') {
          return false;
        }

        // User can review if no existing review found
        return !existingReview;
      } catch (error) {
        console.error('Error in canUserReviewOrder:', error);
        return false;
      }
    },

    // Discount queries
    validateDiscountCode: async (_, { code, orderAmount }, context) => {
      try {
        console.log('🏷️ Validating discount code from GraphQL:', code);
        
        // Get user info from context if available
        const userId = context.user?.id || null;
        const guestEmail = context.guestEmail || null;
        
        const result = await discountManager.validateCode(code, orderAmount, userId, guestEmail);
        
        // Map the result to GraphQL schema
        return {
          valid: result.valid,
          discountCode: result.discountCode ? {
            id: result.discountCode.id,
            code: result.discountCode.code,
            description: result.discountCode.description,
            discountType: result.discountCode.discountType,
            discountValue: result.discountCode.discountValue,
            minimumOrderAmount: result.discountCode.minimumOrderAmount,
            usageLimit: result.discountCode.usageLimit,
            usageCount: result.discountCode.usageCount,
            validFrom: result.discountCode.validFrom,
            validUntil: result.discountCode.validUntil,
            active: result.discountCode.active,
            createdAt: result.discountCode.createdAt,
            updatedAt: result.discountCode.updatedAt
          } : null,
          discountAmount: result.discountAmount,
          message: result.message
        };
      } catch (error) {
        console.error('❌ Error validating discount code:', error);
        return {
          valid: false,
          discountCode: null,
          discountAmount: 0,
          message: 'Error validating discount code'
        };
      }
    },

    getAllDiscountCodes: async () => {
      try {
        console.log('📋 Fetching all discount codes');
        const codes = await discountManager.getAllDiscountCodes();
        
        // Map database fields to GraphQL schema
        return codes.map(code => ({
          id: code.id,
          code: code.code,
          description: code.description,
          discountType: code.discount_type,
          discountValue: parseFloat(code.discount_value),
          minimumOrderAmount: parseFloat(code.minimum_order_amount),
          usageLimit: code.usage_limit,
          usageCount: code.usage_count,
          validFrom: code.valid_from,
          validUntil: code.valid_until,
          active: code.active,
          createdAt: code.created_at,
          updatedAt: code.updated_at
        }));
      } catch (error) {
        console.error('❌ Error fetching discount codes:', error);
        throw new Error('Failed to fetch discount codes');
      }
    },

    getDiscountCodeStats: async (_, { codeId }) => {
      try {
        console.log('📊 Fetching discount code stats for:', codeId);
        return await discountManager.getDiscountStats(codeId);
      } catch (error) {
        console.error('❌ Error fetching discount stats:', error);
        throw new Error('Failed to fetch discount statistics');
      }
    },
    
    // Credit queries
    getUserCreditBalance: async (_, { userId }) => {
      try {
        return await creditHandlers.getUserCreditBalance(userId);
      } catch (error) {
        console.error('❌ Error fetching user credit balance:', error);
        throw new Error('Failed to fetch credit balance');
      }
    },
    
    getUnreadCreditNotifications: async (_, { userId }) => {
      try {
        return await creditHandlers.getUnreadCreditNotifications(userId);
      } catch (error) {
        console.error('❌ Error fetching credit notifications:', error);
        throw new Error('Failed to fetch credit notifications');
      }
    },
    
    getAllCreditTransactions: async (_, { limit, offset }) => {
      try {
        return await creditHandlers.getAllCreditTransactions(limit, offset);
      } catch (error) {
        console.error('❌ Error fetching credit transactions:', error);
        throw new Error('Failed to fetch credit transactions');
      }
    },
    
    getUserCreditHistory: async (_, { userId }) => {
      try {
        return await creditHandlers.getUserCreditHistory(userId);
      } catch (error) {
        console.error('❌ Error fetching user credit history:', error);
        throw new Error('Failed to fetch credit history');
      }
    },

    getAllUsers: async (_, args, context) => {
      try {
        // TODO: Add admin authentication check
        const { user } = context;
        if (!user) {
          throw new Error('Authentication required');
        }

        console.log('📋 Fetching all users using admin API...');
        const client = supabaseClient.getServiceClient();
        
        // Use Supabase Admin API to list users
        const { data: authData, error: authError } = await client.auth.admin.listUsers();
        
        if (authError) {
          console.error('❌ Error fetching auth users:', authError);
          throw new Error('Failed to fetch users from auth');
        }

        const authUsers = authData.users || [];

        // Get user profiles for additional info
        const { data: profiles, error: profileError } = await client
          .from('user_profiles')
          .select('user_id, first_name, last_name, company_name');
        
        if (profileError) {
          console.warn('⚠️ Error fetching user profiles:', profileError);
        }

        // Create profile lookup map
        const profileMap = new Map(
          (profiles || []).map(p => [p.user_id, p])
        );

        // Format users for GraphQL response
        const formattedUsers = authUsers.map(user => {
          const profile = profileMap.get(user.id);
          
          return {
            id: user.id,
            email: user.email,
            firstName: user.user_metadata?.first_name || profile?.first_name || null,
            lastName: user.user_metadata?.last_name || profile?.last_name || null,
            company: profile?.company_name || null,
            createdAt: user.created_at,
            lastSignIn: user.last_sign_in_at
          };
        });

        console.log(`✅ Successfully fetched ${formattedUsers.length} users`);
        return formattedUsers;
      } catch (error) {
        console.error('❌ Error fetching all users:', error);
        throw new Error('Failed to fetch users');
      }
    }
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

    addOrderProof: async (_, { orderId, proofData }) => {
      try {
        if (!supabaseClient.isReady()) {
          throw new Error('Order service is currently unavailable');
        }
        
        // Add proof to database
        const client = supabaseClient.getServiceClient();
        
        // First, get the current proofs
        const { data: currentOrder, error: fetchError } = await client
          .from('orders_main')
          .select('proofs')
          .eq('id', orderId)
          .single();
          
        if (fetchError) {
          throw new Error(`Failed to fetch order: ${fetchError.message}`);
        }
        
        // Create new proof entry
        const newProof = {
          id: `proof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          orderId: orderId,
          proofUrl: proofData.proofUrl,
          proofPublicId: proofData.proofPublicId,
          proofTitle: proofData.proofTitle || 'Proof',
          uploadedAt: new Date().toISOString(),
          uploadedBy: 'admin', // In future, get from auth context
          status: 'pending',
          adminNotes: proofData.adminNotes || null,
          customerNotes: null
        };
        
        // Update proofs array
        const currentProofs = currentOrder.proofs || [];
        const updatedProofs = [...currentProofs, newProof];
        
        // Update order with new proof
        const { data: updatedOrder, error: updateError } = await client
          .from('orders_main')
          .update({ proofs: updatedProofs })
          .eq('id', orderId)
          .select(`
            *,
            order_items_new(*)
          `)
          .single();
          
        if (updateError) {
          throw new Error(`Failed to update order with proof: ${updateError.message}`);
        }
        
               return updatedOrder;
     } catch (error) {
       console.error('Error adding order proof:', error);
       throw new Error(error.message);
     }
   },

   updateProofStatus: async (_, { orderId, proofId, status, customerNotes }) => {
     try {
       if (!supabaseClient.isReady()) {
         throw new Error('Order service is currently unavailable');
       }
       
       const client = supabaseClient.getServiceClient();
       
       // Get current order
       const { data: currentOrder, error: fetchError } = await client
         .from('orders_main')
         .select('proofs')
         .eq('id', orderId)
         .single();
         
       if (fetchError) {
         throw new Error(`Failed to fetch order: ${fetchError.message}`);
       }
       
       // Update the specific proof
       const updatedProofs = (currentOrder.proofs || []).map(proof => {
         if (proof.id === proofId) {
           return {
             ...proof,
             status,
             customerNotes: customerNotes || proof.customerNotes,
             updatedAt: new Date().toISOString(),
             ...(status === 'approved' && { approvedAt: new Date().toISOString() })
           };
         }
         return proof;
       });
       
       // Check if all proofs are approved
       const allApproved = updatedProofs.every(proof => proof.status === 'approved');
       
       // Update order with modified proofs and potentially the order-level proof status
       const updateData = { 
         proofs: updatedProofs 
       };
       
       // If all proofs are approved, update the order-level proof status
       if (allApproved) {
         updateData.proof_status = 'approved';
       } else if (status === 'changes_requested') {
         updateData.proof_status = 'changes_requested';
       }
       
       const { data: updatedOrder, error: updateError } = await client
         .from('orders_main')
         .update(updateData)
         .eq('id', orderId)
         .select(`
           *,
           order_items_new(*)
         `)
         .single();
         
       if (updateError) {
         throw new Error(`Failed to update proof status: ${updateError.message}`);
       }
       
       // Send Discord notification if proof was approved
       if (status === 'approved') {
         try {
           console.log('📱 Sending Discord notification for proof approval...');
           const notificationHelpers = require('./notification-helpers');
           await notificationHelpers.sendProofApprovalNotification(updatedOrder, proofId);
         } catch (notifError) {
           console.error('❌ Failed to send Discord notification:', notifError);
           // Don't throw - we still want to return the updated order
         }
       }
       
       return updatedOrder;
     } catch (error) {
       console.error('Error updating proof status:', error);
       throw new Error(error.message);
     }
   },

   sendProofs: async (_, { orderId }) => {
     try {
       if (!supabaseClient.isReady()) {
         throw new Error('Order service is currently unavailable');
       }
       
       const client = supabaseClient.getServiceClient();
       
       // Get current order
       const { data: currentOrder, error: fetchError } = await client
         .from('orders_main')
         .select('proofs, customer_email, customer_first_name, order_number')
         .eq('id', orderId)
         .single();
         
       if (fetchError) {
         throw new Error(`Failed to fetch order: ${fetchError.message}`);
       }
       
       // Update all proofs to 'sent' status
       const updatedProofs = (currentOrder.proofs || []).map(proof => ({
         ...proof,
         status: 'sent',
         sentAt: new Date().toISOString()
       }));
       
       // Generate proof approval link
       const baseUrl = process.env.FRONTEND_URL || 'https://stickershuttle.com';
       const proofLink = `${baseUrl}/proofs?orderId=${orderId}`;
       
       // Update order with sent proofs and status
       const { data: updatedOrder, error: updateError } = await client
         .from('orders_main')
         .update({ 
           proofs: updatedProofs,
           proof_status: 'awaiting_approval',
           proof_sent_at: new Date().toISOString(),
           proof_link: proofLink
         })
         .eq('id', orderId)
         .select(`
           *,
           order_items_new(*)
         `)
         .single();
         
       if (updateError) {
         throw new Error(`Failed to send proofs: ${updateError.message}`);
       }
       
       // Log successful proof sending (here you would trigger email notification)
       console.log(`✅ Proofs sent for order ${currentOrder.order_number} to ${currentOrder.customer_email}`);
       console.log(`📧 Proof approval link: ${proofLink}`);
       
       return updatedOrder;
     } catch (error) {
       console.error('Error sending proofs:', error);
       throw new Error(error.message);
     }
   },

   replaceProofFile: async (_, { orderId, proofId, newProofData }) => {
     try {
       if (!supabaseClient.isReady()) {
         throw new Error('Order service is currently unavailable');
       }
       
       const client = supabaseClient.getServiceClient();
       
       // Get current order
       const { data: currentOrder, error: fetchError } = await client
         .from('orders_main')
         .select('proofs')
         .eq('id', orderId)
         .single();
         
       if (fetchError) {
         throw new Error(`Failed to fetch order: ${fetchError.message}`);
       }
       
       // Replace the specific proof file (keep same ID and timestamps)
       const updatedProofs = (currentOrder.proofs || []).map(proof => {
         if (proof.id === proofId) {
           return {
             ...proof,
             proofUrl: newProofData.proofUrl,
             proofPublicId: newProofData.proofPublicId,
             proofTitle: newProofData.proofTitle || proof.proofTitle,
             replacedAt: new Date().toISOString(),
             adminNotes: newProofData.adminNotes || proof.adminNotes,
             status: 'pending' // Reset status when file is replaced
           };
         }
         return proof;
       });
       
       // Update order with modified proofs
       const { data: updatedOrder, error: updateError } = await client
         .from('orders_main')
         .update({ proofs: updatedProofs })
         .eq('id', orderId)
         .select(`
           *,
           order_items_new(*)
         `)
         .single();
         
       if (updateError) {
         throw new Error(`Failed to replace proof file: ${updateError.message}`);
       }
       
       return updatedOrder;
     } catch (error) {
       console.error('Error replacing proof file:', error);
       throw new Error(error.message);
     }
   },

   updateProofFileByCustomer: async (_, { orderId, proofId, newFileUrl, originalFileName }) => {
     try {
       if (!supabaseClient.isReady()) {
         throw new Error('Order service is currently unavailable');
       }
       
       const client = supabaseClient.getServiceClient();
       
       // Get current order
       const { data: currentOrder, error: fetchError } = await client
         .from('orders_main')
         .select('proofs')
         .eq('id', orderId)
         .single();
         
       if (fetchError) {
         throw new Error(`Failed to fetch order: ${fetchError.message}`);
       }
       
       // Update the specific proof with new file and mark as replaced
       const updatedProofs = (currentOrder.proofs || []).map(proof => {
         if (proof.id === proofId) {
           return {
             ...proof,
             proofUrl: newFileUrl,
             replaced: true,
             replacedAt: new Date().toISOString(),
             originalFileName: originalFileName,
             updatedAt: new Date().toISOString(),
             status: 'pending' // Reset status when customer replaces file
           };
         }
         return proof;
       });
       
       // Update order with modified proofs
       const { data: updatedOrder, error: updateError } = await client
         .from('orders_main')
         .update({ 
           proofs: updatedProofs,
           proof_status: 'pending' // Reset order proof status when file is replaced
         })
         .eq('id', orderId)
         .select(`
           *,
           order_items_new(*)
         `)
         .single();
         
       if (updateError) {
         throw new Error(`Failed to update proof file: ${updateError.message}`);
       }
       
       console.log(`✅ Customer replaced proof file for order ${orderId}, proof ${proofId}`);
       return updatedOrder;
     } catch (error) {
       console.error('Error updating proof file by customer:', error);
       throw new Error(error.message);
     }
   },

   updateOrderFileByCustomer: async (_, { orderId, newFileUrl, originalFileName }) => {
     try {
       if (!supabaseClient.isReady()) {
         throw new Error('Order service is currently unavailable');
       }
       
       const client = supabaseClient.getServiceClient();
       
       // Get current order and its items
       const { data: currentOrder, error: fetchError } = await client
         .from('orders_main')
         .select(`
           *,
           order_items_new(*)
         `)
         .eq('id', orderId)
         .single();
         
       if (fetchError) {
         throw new Error(`Failed to fetch order: ${fetchError.message}`);
       }
       
       // Update the first item's custom files with the new file
       const updatedItems = (currentOrder.order_items_new || []).map((item, index) => {
         if (index === 0) { // Update the first item
           return {
             ...item,
             customFiles: [newFileUrl], // Replace with new file
             customerReplacementFile: newFileUrl,
             customerReplacementFileName: originalFileName,
             customerReplacementAt: new Date().toISOString()
           };
         }
         return item;
       });
       
       // Update each item in the database
       for (const item of updatedItems) {
         await client
           .from('order_items_new')
           .update({
             customFiles: item.customFiles,
             customerReplacementFile: item.customerReplacementFile,
             customerReplacementFileName: item.customerReplacementFileName,
             customerReplacementAt: item.customerReplacementAt
           })
           .eq('id', item.id);
       }
       
       // Get the updated order
       const { data: updatedOrder, error: updateError } = await client
         .from('orders_main')
         .select(`
           *,
           order_items_new(*)
         `)
         .eq('id', orderId)
         .single();
         
       if (updateError) {
         throw new Error(`Failed to fetch updated order: ${updateError.message}`);
       }
       
       console.log(`✅ Customer replaced order file for order ${orderId}`);
       return updatedOrder;
     } catch (error) {
       console.error('Error updating order file by customer:', error);
       throw new Error(error.message);
     }
   },

   addProofNotes: async (_, { orderId, proofId, adminNotes, customerNotes }) => {
     try {
       if (!supabaseClient.isReady()) {
         throw new Error('Order service is currently unavailable');
       }
       
       const client = supabaseClient.getServiceClient();
       
       // Get current order
       const { data: currentOrder, error: fetchError } = await client
         .from('orders_main')
         .select('proofs')
         .eq('id', orderId)
         .single();
         
       if (fetchError) {
         throw new Error(`Failed to fetch order: ${fetchError.message}`);
       }
       
       // Add notes to the specific proof
       const updatedProofs = (currentOrder.proofs || []).map(proof => {
         if (proof.id === proofId) {
           return {
             ...proof,
             adminNotes: adminNotes || proof.adminNotes,
             customerNotes: customerNotes || proof.customerNotes,
             notesUpdatedAt: new Date().toISOString()
           };
         }
         return proof;
       });
       
       // Update order with modified proofs
       const { data: updatedOrder, error: updateError } = await client
         .from('orders_main')
         .update({ proofs: updatedProofs })
         .eq('id', orderId)
         .select(`
           *,
           order_items_new(*)
         `)
         .single();
         
       if (updateError) {
         throw new Error(`Failed to add proof notes: ${updateError.message}`);
       }
       
       return updatedOrder;
     } catch (error) {
       console.error('Error adding proof notes:', error);
       throw new Error(error.message);
     }
   },

   approveProof: async (_, { orderId, proofId, adminNotes }) => {
     try {
       if (!supabaseClient.isReady()) {
         throw new Error('Order service is currently unavailable');
       }
       
       const client = supabaseClient.getServiceClient();
       
       // Get current order
       const { data: currentOrder, error: fetchError } = await client
         .from('orders_main')
         .select('proofs')
         .eq('id', orderId)
         .single();
         
       if (fetchError) {
         throw new Error(`Failed to fetch order: ${fetchError.message}`);
       }
       
       // Approve the specific proof
       const updatedProofs = (currentOrder.proofs || []).map(proof => {
         if (proof.id === proofId) {
           return {
             ...proof,
             status: 'approved',
             adminNotes: adminNotes || proof.adminNotes,
             approvedAt: new Date().toISOString(),
             approvedBy: 'admin' // In future, get from auth context
           };
         }
         return proof;
       });
       
       // Check if all proofs are approved
       const allApproved = updatedProofs.every(proof => proof.status === 'approved');
       
       // Update order with approved proof
       const { data: updatedOrder, error: updateError } = await client
         .from('orders_main')
         .update({ 
           proofs: updatedProofs,
           ...(allApproved && { 
             proof_status: 'approved',
             order_status: 'Ready for Production'
           })
         })
         .eq('id', orderId)
         .select(`
           *,
           order_items_new(*)
         `)
         .single();
         
       if (updateError) {
         throw new Error(`Failed to approve proof: ${updateError.message}`);
       }
       
       return updatedOrder;
     } catch (error) {
       console.error('Error approving proof:', error);
       throw new Error(error.message);
     }
   },

   requestProofChanges: async (_, { orderId, proofId, adminNotes }) => {
     try {
       if (!supabaseClient.isReady()) {
         throw new Error('Order service is currently unavailable');
       }
       
       const client = supabaseClient.getServiceClient();
       
       // Get current order
       const { data: currentOrder, error: fetchError } = await client
         .from('orders_main')
         .select('proofs')
         .eq('id', orderId)
         .single();
         
       if (fetchError) {
         throw new Error(`Failed to fetch order: ${fetchError.message}`);
       }
       
       // Request changes for the specific proof
       const updatedProofs = (currentOrder.proofs || []).map(proof => {
         if (proof.id === proofId) {
           return {
             ...proof,
             status: 'changes_requested',
             adminNotes: adminNotes,
             changesRequestedAt: new Date().toISOString(),
             requestedBy: 'admin' // In future, get from auth context
           };
         }
         return proof;
       });
       
       // Update order with changes requested
       const { data: updatedOrder, error: updateError } = await client
         .from('orders_main')
         .update({ 
           proofs: updatedProofs,
           proof_status: 'changes_requested'
         })
         .eq('id', orderId)
         .select(`
           *,
           order_items_new(*)
         `)
         .single();
         
       if (updateError) {
         throw new Error(`Failed to request proof changes: ${updateError.message}`);
       }
       
       return updatedOrder;
     } catch (error) {
       console.error('Error requesting proof changes:', error);
       throw new Error(error.message);
     }
   },

    // EasyPost tracking mutations
    createEasyPostTracker: async (_, { trackingCode, orderId, carrier }) => {
      try {
        if (!easyPostClient.isReady()) {
          throw new Error('EasyPost service is currently unavailable');
        }

        const result = await trackingEnhancer.createTracker(trackingCode, orderId, carrier);
        
        return {
          success: true,
          message: 'Tracker created successfully',
          trackingCode: result.tracking_code,
          status: result.status,
          carrier: result.carrier,
          publicUrl: result.public_url,
          estDeliveryDate: result.est_delivery_date
        };
      } catch (error) {
        console.error('Error creating EasyPost tracker:', error);
        return {
          success: false,
          message: error.message,
          trackingCode: trackingCode,
          status: null,
          carrier: null,
          publicUrl: null,
          estDeliveryDate: null
        };
      }
    },

    refreshOrderTracking: async (_, { orderId }) => {
      try {
        if (!supabaseClient.isReady()) {
          throw new Error('Order service is currently unavailable');
        }

        const client = supabaseClient.getServiceClient();
        
        // Get order tracking number
        const { data: order, error } = await client
          .from('orders_main')
          .select('tracking_number')
          .eq('id', orderId)
          .single();

        if (error || !order?.tracking_number) {
          throw new Error('Order not found or no tracking number available');
        }

        const trackingStatus = await trackingEnhancer.getTrackingStatus(order.tracking_number);
        
        // Process the update
        const mockTracker = {
          tracking_code: order.tracking_number,
          status: trackingStatus.status,
          carrier: trackingStatus.carrier,
          public_url: trackingStatus.public_url,
          est_delivery_date: trackingStatus.est_delivery_date,
          tracking_details: trackingStatus.tracking_details
        };

        await trackingEnhancer.processTrackingUpdate(mockTracker);

        return {
          success: true,
          message: 'Tracking refreshed successfully',
          trackingCode: order.tracking_number,
          status: trackingStatus.status,
          carrier: trackingStatus.carrier,
          publicUrl: trackingStatus.public_url,
          estDeliveryDate: trackingStatus.est_delivery_date
        };
      } catch (error) {
        console.error('Error refreshing order tracking:', error);
        return {
          success: false,
          message: error.message,
          trackingCode: null,
          status: null,
          carrier: null,
          publicUrl: null,
          estDeliveryDate: null
        };
      }
    },

    refreshAllActiveTracking: async (_, args, context) => {
      try {
        if (!easyPostClient.isReady()) {
          throw new Error('EasyPost service is currently unavailable');
        }

        console.log('🔄 Starting bulk tracking refresh...');
        const startTime = Date.now();
        
        await trackingEnhancer.refreshAllActiveTracking();
        
        const endTime = Date.now();
        const duration = (endTime - startTime) / 1000;

        // Get count of active orders for reporting
        let processedCount = 0;
        if (supabaseClient.isReady()) {
          const client = supabaseClient.getServiceClient();
          const { data: orders } = await client
            .from('orders_main')
            .select('id')
            .not('tracking_number', 'is', null)
            .not('order_status', 'eq', 'Delivered')
            .not('order_status', 'eq', 'Cancelled');
          
          processedCount = orders?.length || 0;
        }

        return {
          success: true,
          message: `Successfully refreshed tracking for ${processedCount} orders in ${duration}s`,
          processedCount: processedCount,
          errors: []
        };
      } catch (error) {
        console.error('Error refreshing all tracking:', error);
        return {
          success: false,
          message: error.message,
          processedCount: 0,
          errors: [error.message]
        };
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
        let actualCreditsApplied = 0;
        let remainingCredits = 0;

        // Step 1: Calculate credits before creating order
        const cartSubtotal = input.cartItems.reduce((sum, item) => sum + item.totalPrice, 0);
        const discountAmount = input.discountAmount || 0;
        const creditsToApply = input.creditsToApply || 0;
        
        // Apply credits if provided
        if (creditsToApply > 0 && input.userId) {
          try {
            // Check user's credit balance
            const creditBalance = await creditHandlers.getUserCreditBalance(input.userId);
            remainingCredits = creditBalance.balance;
            
            // Calculate how much credit can be applied
            const afterDiscountTotal = cartSubtotal - discountAmount;
            actualCreditsApplied = Math.min(creditsToApply, creditBalance.balance, afterDiscountTotal);
            
            console.log('💳 Credit application:', {
              requested: creditsToApply,
              available: creditBalance.balance,
              applied: actualCreditsApplied,
              afterDiscountTotal
            });
          } catch (creditError) {
            console.error('Error checking credits:', creditError);
            // Continue without credits if there's an error
          }
        }

        // Step 2: Prepare order in Supabase (as pending payment) with correct credits
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
              subtotal_price: cartSubtotal,
              total_tax: 0, // Will be updated after Stripe checkout
              total_price: cartSubtotal - discountAmount - actualCreditsApplied,
              discount_code: input.discountCode || null,
              discount_amount: discountAmount || 0,
              credits_applied: actualCreditsApplied, // Set the actual credits that will be applied
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

              // CRITICAL FIX: Actually deduct credits NOW, not in webhook
              if (actualCreditsApplied > 0 && input.userId) {
                try {
                  console.log('💳 DEDUCTING credits immediately:', actualCreditsApplied);
                  console.log('💳 Order ID:', customerOrder.id);
                  console.log('💳 User ID:', input.userId);
                  
                  const creditResult = await creditHandlers.applyCreditsToOrder(
                    customerOrder.id,
                    actualCreditsApplied,
                    input.userId
                  );
                  
                  if (creditResult.success) {
                    console.log('✅ Credits deducted successfully, remaining balance:', creditResult.remainingBalance);
                    remainingCredits = creditResult.remainingBalance;
                  } else {
                    console.error('⚠️ Failed to deduct credits immediately:', creditResult.error);
                    // If credit deduction fails, we should not proceed with checkout
                    errors.push(`Credit deduction failed: ${creditResult.error}`);
                    actualCreditsApplied = 0; // Reset credits applied
                  }
                } catch (creditError) {
                  console.error('⚠️ Critical error deducting credits:', creditError);
                  errors.push(`Credit system error: ${creditError.message}`);
                  actualCreditsApplied = 0; // Reset credits applied
                }
              }
            }
          } catch (supabaseError) {
            console.error('❌ Supabase order creation failed:', supabaseError);
            errors.push(`Order tracking setup failed: ${supabaseError.message}`);
          }
        } else {
          console.error('❌ Supabase client is not ready');
          errors.push('Order tracking service is not available');
        }

        // Step 3: Create Stripe checkout session
        if (stripeClient.isReady() && errors.length === 0) {
          try {
            console.log('🔍 Stripe client is ready, creating checkout session...');
            const baseUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
            
            // Calculate final cart total (credits already calculated in Step 1)
            const cartTotal = cartSubtotal - discountAmount - actualCreditsApplied;
            
            const checkoutData = {
              lineItems: input.cartItems.map(item => ({
                name: item.productName,
                description: `${item.productName} - Custom Configuration`,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice, // Add totalPrice for accurate Stripe calculations
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
              // Simplified order note for Stripe metadata (under 500 chars)
              orderNote: `${input.cartItems.length} items - $${cartTotal.toFixed(2)}${discountAmount > 0 ? ` (Discount: -$${discountAmount.toFixed(2)})` : ''}${actualCreditsApplied > 0 ? ` (Credits: -$${actualCreditsApplied.toFixed(2)})` : ''}`,
              cartMetadata: {
                itemCount: input.cartItems.length,
                subtotalAmount: cartSubtotal.toFixed(2),
                discountAmount: (discountAmount + actualCreditsApplied).toFixed(2), // Include credits in total discount
                creditsApplied: actualCreditsApplied.toFixed(2),
                totalAmount: cartTotal.toFixed(2),
                customerEmail: input.customerInfo.email,
                discountCode: input.discountCode || null
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
          errors: errors.length > 0 ? errors : null,
          creditsApplied: actualCreditsApplied,
          remainingCredits: remainingCredits - actualCreditsApplied
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
          errors: [error.message],
          creditsApplied: 0,
          remainingCredits: 0
        };
      }
    },

    removeProof: async (_, { orderId, proofId }) => {
      try {
        if (!supabaseClient.isReady()) {
          throw new Error('Order service is currently unavailable');
        }
        
        const client = supabaseClient.getServiceClient();
        
        // Get current order
        const { data: currentOrder, error: fetchError } = await client
          .from('orders_main')
          .select('proofs')
          .eq('id', orderId)
          .single();
          
        if (fetchError) {
          throw new Error(`Failed to fetch order: ${fetchError.message}`);
        }
        
        // Remove the specific proof
        const updatedProofs = (currentOrder.proofs || []).filter(proof => proof.id !== proofId);
        
        // Update order with modified proofs
        const { data: updatedOrder, error: updateError } = await client
          .from('orders_main')
          .update({ proofs: updatedProofs })
          .eq('id', orderId)
          .select(`
            *,
            order_items_new(*)
          `)
          .single();
          
        if (updateError) {
          throw new Error(`Failed to remove proof: ${updateError.message}`);
        }
        
        return updatedOrder;
      } catch (error) {
        console.error('Error removing proof:', error);
        throw new Error(error.message);
      }
    },

    // EasyPost Mutations
    createEasyPostShipment: async (_, { orderId, packageDimensions }) => {
      try {
        console.log('🔍 DEBUG: EasyPost client status check...');
        console.log('easyPostClient exists:', !!easyPostClient);
        
        // The isReady() method now handles re-initialization automatically
        const isReady = easyPostClient.isReady();
        console.log('easyPostClient.isReady():', isReady);
        
        if (!isReady) {
          console.log('❌ EasyPost client not ready - check logs above for details');
          return {
            success: false,
            error: 'EasyPost service is not configured. Please check server logs for details.'
          };
        }
        
        console.log('✅ EasyPost client is ready - proceeding with shipment creation');

        if (!supabaseClient.isReady()) {
          return {
            success: false,
            error: 'Order service is currently unavailable'
          };
        }

        // Get the order from Supabase
        const client = supabaseClient.getServiceClient();
        const { data: order, error: orderError } = await client
          .from('orders_main')
          .select(`
            *,
            order_items_new(*)
          `)
          .eq('id', orderId)
          .single();

        if (orderError || !order) {
          return {
            success: false,
            error: `Order not found: ${orderError?.message || 'Unknown error'}`
          };
        }

        // Handle from address based on test/production mode
        let fromAddress;
        
        if (easyPostClient.isTestMode()) {
          console.log('📍 Test mode detected - creating from address on the fly');
          // In test mode, create address object
          fromAddress = {
            name: 'Sticker Shuttle',
            company: 'Sticker Shuttle',
            street1: '2981 S Harrison St',
            street2: null,
            city: 'Denver',
            state: 'CO',
            zip: '80210',
            country: 'US',
            phone: '720-555-0000', // Test phone number
            email: 'justin@stickershuttle.com'
          };
        } else {
          console.log('📍 Production mode - using pre-verified address ID');
          // In production, use pre-verified address ID
          fromAddress = 'adr_31c828354d4a11f08f10ac1f6bc539aa';
        }

        // Format order for EasyPost
        const shipmentData = easyPostClient.formatOrderForShipment(order, fromAddress, packageDimensions);
        
        // Create shipment with EasyPost
        const shipment = await easyPostClient.createShipment(shipmentData);

        return {
          success: true,
          shipment: {
            id: shipment.id,
            rates: shipment.rates.map(rate => ({
              id: rate.id,
              carrier: rate.carrier,
              service: rate.service,
              rate: rate.rate,
              currency: rate.currency,
              delivery_days: rate.delivery_days,
              delivery_date: rate.delivery_date,
              delivery_date_guaranteed: rate.delivery_date_guaranteed
            })),
            to_address: shipment.to_address,
            from_address: shipment.from_address,
            parcel: shipment.parcel,
            reference: shipment.reference
          }
        };
      } catch (error) {
        console.error('Error creating EasyPost shipment:', error);
        
        // Log more details about the error
        if (error.message && error.message.includes('resource could not be found')) {
          console.error('❌ Resource not found error - this usually means:');
          console.error('  1. Using production address ID in test mode');
          console.error('  2. Invalid address ID');
          console.error('  3. Address was deleted');
          console.error('Current mode:', easyPostClient.isTestMode() ? 'TEST' : 'PRODUCTION');
        }
        
        return {
          success: false,
          error: error.message || 'Failed to create shipment'
        };
      }
    },

    buyEasyPostLabel: async (_, { shipmentId, rateId, orderId, insurance }) => {
      try {
        console.log('🎯 buyEasyPostLabel called with:', {
          shipmentId,
          rateId,
          orderId,
          insurance,
          hasOrderId: !!orderId
        });
        
        if (!easyPostClient.isReady()) {
          return {
            success: false,
            error: 'EasyPost service is not configured'
          };
        }

        // First, retrieve the shipment to get the complete rate object
        const client = easyPostClient.getClient();
        const shipment = await client.Shipment.retrieve(shipmentId);
        
        console.log('📦 Retrieved shipment for label purchase:', {
          id: shipment.id,
          reference: shipment.reference,
          has_reference: !!shipment.reference
        });
        
        // Find the complete rate object by ID
        const rate = shipment.rates.find(r => r.id === rateId);
        if (!rate) {
          return {
            success: false,
            error: 'Selected rate not found in shipment'
          };
        }
        
        // Buy the label with the complete rate object
        const boughtShipment = await easyPostClient.buyShipment(shipmentId, rate, insurance);

        // Update the order with tracking information
        if (boughtShipment.tracking_code && supabaseClient.isReady()) {
          try {
            const client = supabaseClient.getServiceClient();
            
            console.log('📋 Updating order with ID:', orderId);
            
            const { error: updateError } = await client
              .from('orders_main')
              .update({
                tracking_number: boughtShipment.tracking_code,
                tracking_company: boughtShipment.tracker?.carrier || boughtShipment.selected_rate?.carrier,
                tracking_url: boughtShipment.tracker?.public_url,
                fulfillment_status: 'partial', // Changed from 'fulfilled' to 'partial' for shipped status
                order_status: 'Shipped', // Add explicit order status
                proof_status: 'label_printed', // Changed from 'shipped' to 'label_printed' to distinguish label printing from actual shipping
                updated_at: new Date().toISOString()
              })
              .eq('id', orderId); // Use the orderId parameter directly

            if (updateError) {
              console.error('❌ Failed to update order with tracking info:', updateError);
              console.error('Order ID attempted:', orderId);
            } else {
              console.log('✅ Order updated with tracking information and status set to Shipped:', boughtShipment.tracking_code);
              console.log('Updated order ID:', orderId);
              
              // Verify the update
              const { data: verifyOrder, error: verifyError } = await client
                .from('orders_main')
                .select('id, order_status, proof_status, tracking_number, tracking_company, tracking_url')
                .eq('id', orderId)
                .single();
                
              if (verifyError) {
                console.error('❌ Error verifying order update:', verifyError);
              } else {
                console.log('✅ Verified order status:', verifyOrder);
              }
            }
          } catch (updateErr) {
            console.error('❌ Error updating order with tracking info:', updateErr);
          }
        }

        return {
          success: true,
          shipment: {
            id: boughtShipment.id,
            tracking_code: boughtShipment.tracking_code,
            postage_label: {
              id: boughtShipment.postage_label.id,
              label_url: boughtShipment.postage_label.label_url,
              label_file_type: boughtShipment.postage_label.label_file_type,
              label_size: boughtShipment.postage_label.label_size
            },
            selected_rate: {
              id: boughtShipment.selected_rate.id,
              carrier: boughtShipment.selected_rate.carrier,
              service: boughtShipment.selected_rate.service,
              rate: boughtShipment.selected_rate.rate,
              currency: boughtShipment.selected_rate.currency,
              delivery_days: boughtShipment.selected_rate.delivery_days,
              delivery_date: boughtShipment.selected_rate.delivery_date,
              delivery_date_guaranteed: boughtShipment.selected_rate.delivery_date_guaranteed
            },
            tracker: {
              id: boughtShipment.tracker.id,
              tracking_code: boughtShipment.tracker.tracking_code,
              carrier: boughtShipment.tracker.carrier,
              public_url: boughtShipment.tracker.public_url,
              status: boughtShipment.tracker.status,
              est_delivery_date: boughtShipment.tracker.est_delivery_date
            }
          }
        };
      } catch (error) {
        console.error('Error buying EasyPost label:', error);
        return {
          success: false,
          error: error.message
        };
      }
    },

    trackEasyPostShipment: async (_, { trackingCode }) => {
      try {
        if (!easyPostClient.isReady()) {
          return {
            success: false,
            error: 'EasyPost service is not configured'
          };
        }

        const tracker = await easyPostClient.trackShipment(trackingCode);

        return {
          success: true,
          tracker: {
            id: tracker.id,
            tracking_code: tracker.tracking_code,
            carrier: tracker.carrier,
            public_url: tracker.public_url,
            status: tracker.status,
            est_delivery_date: tracker.est_delivery_date
          }
        };
      } catch (error) {
        console.error('Error tracking EasyPost shipment:', error);
        return {
          success: false,
          error: error.message
        };
      }
    },

    // Manual tracking update for testing/debugging
    updateOrderTracking: async (_, { orderId }) => {
      try {
        if (!supabaseClient.isReady()) {
          throw new Error('Order service is currently unavailable');
        }

        // Get the order with tracking info
        const client = supabaseClient.getServiceClient();
        const { data: order, error: orderError } = await client
          .from('orders_main')
          .select('id, tracking_number, tracking_company, proof_status')
          .eq('id', orderId)
          .single();

        if (orderError || !order || !order.tracking_number) {
          throw new Error('Order not found or no tracking number available');
        }

        // Get latest tracking info from EasyPost
        if (!easyPostClient.isReady()) {
          throw new Error('EasyPost service is not configured');
        }

        const tracker = await easyPostClient.trackShipment(order.tracking_number);
        
        // Update order status based on tracking status
        let fulfillmentStatus = 'partial';
        let orderStatus = 'Shipped';
        let proofStatus = order.proof_status || 'label_printed';
        
        switch (tracker.status) {
          case 'pre_transit':
          case 'in_transit':
            fulfillmentStatus = 'partial';
            orderStatus = 'Shipped';
            proofStatus = 'shipped';
            break;
          case 'out_for_delivery':
            fulfillmentStatus = 'partial';
            orderStatus = 'Out for Delivery';
            proofStatus = 'shipped';
            break;
          case 'delivered':
            fulfillmentStatus = 'fulfilled';
            orderStatus = 'Delivered';
            proofStatus = 'delivered';
            break;
          case 'exception':
          case 'failure':
            fulfillmentStatus = 'partial';
            orderStatus = 'Shipping Issue';
            proofStatus = 'shipped';
            break;
        }

        // Update the order
        const { data: updatedOrder, error: updateError } = await client
          .from('orders_main')
          .update({
            fulfillment_status: fulfillmentStatus,
            order_status: orderStatus,
            proof_status: proofStatus,
            updated_at: new Date().toISOString()
          })
          .eq('id', orderId)
          .select(`
            *,
            order_items_new(*)
          `)
          .single();

        if (updateError) {
          throw new Error(`Failed to update order: ${updateError.message}`);
        }

        return {
          ...updatedOrder,
          trackingInfo: {
            status: tracker.status,
            carrier: tracker.carrier,
            est_delivery_date: tracker.est_delivery_date,
            public_url: tracker.public_url
          }
        };
      } catch (error) {
        console.error('Error updating order tracking:', error);
        throw new Error(error.message);
      }
    },

    // Review Mutations
    createReview: async (_, { input }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        const client = supabaseClient.getServiceClient();
        
        // Check if user has already reviewed this product
        const { data: existingReview, error: checkError } = await client
          .from('reviews')
          .select('id')
          .eq('user_id', user.id)
          .eq('product_id', input.productId)
          .single();

        if (checkError && checkError.code !== 'PGRST116') { // PGRST116 is "no rows returned"
          throw new Error('Failed to check existing reviews');
        }

        if (existingReview) {
          throw new Error('You have already reviewed this product');
        }

        // Check if user has purchased this product
        const canReview = await client
          .rpc('can_user_review_product', { 
            p_user_id: user.id, 
            p_product_id: input.productId 
          });

        if (canReview.error) {
          throw new Error('Failed to verify purchase eligibility');
        }

        if (!canReview.data) {
          throw new Error('You can only review products you have purchased');
        }

        // Find the order that contains this product for verification
        const { data: orderData, error: orderError } = await client
          .from('orders_main')
          .select(`
            id,
            order_items_new!inner(product_id)
          `)
          .eq('user_id', user.id)
          .eq('financial_status', 'paid')
          .eq('order_items_new.product_id', input.productId)
          .limit(1)
          .single();

        // Create the review
        const { data: newReview, error: createError } = await client
          .from('reviews')
          .insert({
            user_id: user.id,
            product_id: input.productId,
            product_category: input.productCategory,
            rating: input.rating,
            title: input.title,
            comment: input.comment,
            is_verified_purchase: !orderError && orderData ? true : false,
            order_id: !orderError && orderData ? orderData.id : null,
            status: 'active'
          })
          .select(`
            *,
            auth.users!inner(email)
          `)
          .single();

        if (createError) {
          console.error('Error creating review:', createError);
          throw new Error('Failed to create review');
        }

        return {
          ...newReview,
          userEmail: newReview.users?.email || user.email,
          userFirstName: user.user_metadata?.first_name || '',
          userLastName: user.user_metadata?.last_name || '',
          userDisplayName: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || 'Anonymous User'
        };
      } catch (error) {
        console.error('Error in createReview:', error);
        throw new Error(error.message);
      }
    },

    updateReview: async (_, { reviewId, input }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        const client = supabaseClient.getServiceClient();
        
        // Check if review exists and belongs to user
        const { data: existingReview, error: checkError } = await client
          .from('reviews')
          .select('id, user_id')
          .eq('id', reviewId)
          .eq('user_id', user.id)
          .single();

        if (checkError) {
          throw new Error('Review not found or access denied');
        }

        // Update the review
        const updateData = {};
        if (input.rating !== undefined) updateData.rating = input.rating;
        if (input.title !== undefined) updateData.title = input.title;
        if (input.comment !== undefined) updateData.comment = input.comment;
        updateData.updated_at = new Date().toISOString();

        const { data: updatedReview, error: updateError } = await client
          .from('reviews')
          .update(updateData)
          .eq('id', reviewId)
          .select(`
            *,
            auth.users!inner(email)
          `)
          .single();

        if (updateError) {
          console.error('Error updating review:', updateError);
          throw new Error('Failed to update review');
        }

        return {
          ...updatedReview,
          userEmail: updatedReview.users?.email || user.email,
          userFirstName: user.user_metadata?.first_name || '',
          userLastName: user.user_metadata?.last_name || '',
          userDisplayName: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || 'Anonymous User'
        };
      } catch (error) {
        console.error('Error in updateReview:', error);
        throw new Error(error.message);
      }
    },

    deleteReview: async (_, { reviewId }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        const client = supabaseClient.getServiceClient();
        
        // Check if review exists and belongs to user
        const { data: existingReview, error: checkError } = await client
          .from('reviews')
          .select('id, user_id')
          .eq('id', reviewId)
          .eq('user_id', user.id)
          .single();

        if (checkError) {
          throw new Error('Review not found or access denied');
        }

        // Delete the review
        const { error: deleteError } = await client
          .from('reviews')
          .delete()
          .eq('id', reviewId);

        if (deleteError) {
          console.error('Error deleting review:', deleteError);
          throw new Error('Failed to delete review');
        }

        return true;
      } catch (error) {
        console.error('Error in deleteReview:', error);
        throw new Error(error.message);
      }
    },

    voteOnReview: async (_, { reviewId, isHelpful }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        const client = supabaseClient.getServiceClient();
        
        // Check if review exists
        const { data: review, error: reviewError } = await client
          .from('reviews')
          .select('id')
          .eq('id', reviewId)
          .single();

        if (reviewError) {
          throw new Error('Review not found');
        }

        // Upsert the vote (insert or update)
        const { error: voteError } = await client
          .from('review_votes')
          .upsert({
            review_id: reviewId,
            user_id: user.id,
            is_helpful: isHelpful
          }, {
            onConflict: 'review_id,user_id'
          });

        if (voteError) {
          console.error('Error voting on review:', voteError);
          throw new Error('Failed to vote on review');
        }

        // Get updated review with vote counts
        const { data: updatedReview, error: fetchError } = await client
          .rpc('get_product_reviews', { 
            p_product_id: review.product_id, 
            p_limit: 1, 
            p_offset: 0 
          })
          .eq('id', reviewId)
          .single();

        if (fetchError) {
          console.error('Error fetching updated review:', fetchError);
          throw new Error('Failed to fetch updated review');
        }

        return updatedReview;
      } catch (error) {
        console.error('Error in voteOnReview:', error);
        throw new Error(error.message);
      }
    },

    // Order Review Mutations
    createOrderReview: async (_, { input }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        const client = supabaseClient.getServiceClient();
        
        // Check if order exists and belongs to user
        const { data: order, error: orderError } = await client
          .from('orders_main')
          .select('id, user_id, financial_status')
          .eq('id', input.orderId)
          .eq('user_id', user.id)
          .single();

        if (orderError) {
          throw new Error('Order not found or access denied');
        }

        // Only allow reviews for paid orders
        if (order.financial_status !== 'paid') {
          throw new Error('You can only review completed orders');
        }

        // Check if user has already reviewed this order
        const { data: existingReview, error: checkError } = await client
          .from('reviews')
          .select('id')
          .eq('user_id', user.id)
          .eq('order_id', input.orderId)
          .eq('product_category', 'order')
          .single();

        if (checkError && checkError.code !== 'PGRST116') {
          throw new Error('Failed to check existing reviews');
        }

        if (existingReview) {
          throw new Error('You have already reviewed this order');
        }

        // Create the order review
        const { data: newReview, error: createError } = await client
          .from('reviews')
          .insert({
            user_id: user.id,
            product_id: 'order-' + input.orderId, // Use order ID as product ID for order reviews
            product_category: 'order',
            rating: input.rating,
            title: input.title || '',
            comment: input.comment || '',
            is_verified_purchase: true, // Order reviews are always verified
            order_id: input.orderId,
            status: 'active'
          })
          .select(`
            *,
            auth.users!inner(email)
          `)
          .single();

        if (createError) {
          console.error('Error creating order review:', createError);
          throw new Error('Failed to create review');
        }

        return {
          ...newReview,
          userEmail: newReview.users?.email || user.email,
          userFirstName: user.user_metadata?.first_name || '',
          userLastName: user.user_metadata?.last_name || '',
          userDisplayName: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || 'Anonymous User'
        };
      } catch (error) {
        console.error('Error in createOrderReview:', error);
        throw new Error(error.message);
      }
    },

    updateOrderReview: async (_, { reviewId, input }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        const client = supabaseClient.getServiceClient();
        
        // Check if review exists and belongs to user
        const { data: existingReview, error: checkError } = await client
          .from('reviews')
          .select('id, user_id, order_id')
          .eq('id', reviewId)
          .eq('user_id', user.id)
          .single();

        if (checkError) {
          throw new Error('Review not found or access denied');
        }

        // Ensure this is an order review
        if (!existingReview.order_id) {
          throw new Error('Invalid review type');
        }

        // Update the review
        const updateData = {};
        if (input.rating !== undefined) updateData.rating = input.rating;
        if (input.title !== undefined) updateData.title = input.title;
        if (input.comment !== undefined) updateData.comment = input.comment;
        updateData.updated_at = new Date().toISOString();

        const { data: updatedReview, error: updateError } = await client
          .from('reviews')
          .update(updateData)
          .eq('id', reviewId)
          .select(`
            *,
            auth.users!inner(email)
          `)
          .single();

        if (updateError) {
          console.error('Error updating order review:', updateError);
          throw new Error('Failed to update review');
        }

        return {
          ...updatedReview,
          userEmail: updatedReview.users?.email || user.email,
          userFirstName: user.user_metadata?.first_name || '',
          userLastName: user.user_metadata?.last_name || '',
          userDisplayName: `${user.user_metadata?.first_name || ''} ${user.user_metadata?.last_name || ''}`.trim() || 'Anonymous User'
        };
      } catch (error) {
        console.error('Error in updateOrderReview:', error);
        throw new Error(error.message);
      }
    },

    deleteOrderReview: async (_, { reviewId }, context) => {
      const { user } = context;
      if (!user) {
        throw new AuthenticationError('Authentication required');
      }

      try {
        const client = supabaseClient.getServiceClient();
        
        // Check if review exists and belongs to user
        const { data: existingReview, error: checkError } = await client
          .from('reviews')
          .select('id, user_id, order_id')
          .eq('id', reviewId)
          .eq('user_id', user.id)
          .single();

        if (checkError) {
          throw new Error('Review not found or access denied');
        }

        // Ensure this is an order review
        if (!existingReview.order_id) {
          throw new Error('Invalid review type');
        }

        // Delete the review
        const { error: deleteError } = await client
          .from('reviews')
          .delete()
          .eq('id', reviewId);

        if (deleteError) {
          console.error('Error deleting order review:', deleteError);
          throw new Error('Failed to delete review');
        }

        return true;
      } catch (error) {
        console.error('Error in deleteOrderReview:', error);
        throw new Error(error.message);
      }
    },

    // Discount mutations
    createDiscountCode: async (_, { input }, context) => {
      try {
        console.log('🎫 Creating discount code:', input);
        
        // TODO: Add admin authentication check here
        // if (!context.user || !isAdmin(context.user)) {
        //   throw new AuthenticationError('Admin access required');
        // }
        
        const code = await discountManager.createDiscountCode(input);
        
        // Map database fields to GraphQL schema
        return {
          id: code.id,
          code: code.code,
          description: code.description,
          discountType: code.discount_type,
          discountValue: parseFloat(code.discount_value),
          minimumOrderAmount: parseFloat(code.minimum_order_amount),
          usageLimit: code.usage_limit,
          usageCount: code.usage_count,
          validFrom: code.valid_from,
          validUntil: code.valid_until,
          active: code.active,
          createdAt: code.created_at,
          updatedAt: code.updated_at
        };
      } catch (error) {
        console.error('❌ Error creating discount code:', error);
        throw new Error(error.message);
      }
    },

    updateDiscountCode: async (_, { id, input }, context) => {
      try {
        console.log('📝 Updating discount code:', id, input);
        
        // TODO: Add admin authentication check here
        
        const code = await discountManager.updateDiscountCode(id, input);
        
        // Map database fields to GraphQL schema
        return {
          id: code.id,
          code: code.code,
          description: code.description,
          discountType: code.discount_type,
          discountValue: parseFloat(code.discount_value),
          minimumOrderAmount: parseFloat(code.minimum_order_amount),
          usageLimit: code.usage_limit,
          usageCount: code.usage_count,
          validFrom: code.valid_from,
          validUntil: code.valid_until,
          active: code.active,
          createdAt: code.created_at,
          updatedAt: code.updated_at
        };
      } catch (error) {
        console.error('❌ Error updating discount code:', error);
        throw new Error(error.message);
      }
    },

    deleteDiscountCode: async (_, { id }, context) => {
      try {
        console.log('🗑️ Deleting discount code:', id);
        
        // TODO: Add admin authentication check here
        
        return await discountManager.deleteDiscountCode(id);
      } catch (error) {
        console.error('❌ Error deleting discount code:', error);
        throw new Error(error.message);
      }
    },

    applyDiscountToCheckout: async (_, { code, orderAmount }, context) => {
      try {
        console.log('💰 Applying discount to checkout:', code, orderAmount);
        
        // Get user info from context if available
        const userId = context.user?.id || null;
        const guestEmail = context.guestEmail || null;
        
        const result = await discountManager.validateCode(code, orderAmount, userId, guestEmail);
        
        // Map the result to GraphQL schema
        return {
          valid: result.valid,
          discountCode: result.discountCode ? {
            id: result.discountCode.id,
            code: result.discountCode.code,
            description: result.discountCode.description,
            discountType: result.discountCode.discountType,
            discountValue: result.discountCode.discountValue,
            minimumOrderAmount: result.discountCode.minimumOrderAmount,
            usageLimit: result.discountCode.usageLimit,
            usageCount: result.discountCode.usageCount,
            validFrom: result.discountCode.validFrom,
            validUntil: result.discountCode.validUntil,
            active: result.discountCode.active,
            createdAt: result.discountCode.createdAt,
            updatedAt: result.discountCode.updatedAt
          } : null,
          discountAmount: result.discountAmount,
          message: result.message
        };
      } catch (error) {
        console.error('❌ Error applying discount:', error);
        return {
          valid: false,
          discountCode: null,
          discountAmount: 0,
          message: 'Error applying discount'
        };
      }
    },
    
    // Credit mutations
    markCreditNotificationsRead: async (_, { userId }) => {
      try {
        return await creditHandlers.markCreditNotificationsRead(userId);
      } catch (error) {
        console.error('❌ Error marking credit notifications as read:', error);
        throw new Error('Failed to mark notifications as read');
      }
    },
    
    addUserCredits: async (_, { input }, context) => {
      try {
        // TODO: Add admin authentication check
        const adminUserId = context.user?.id || null;
        return await creditHandlers.addUserCredits(input, adminUserId);
      } catch (error) {
        console.error('❌ Error adding user credits:', error);
        throw new Error('Failed to add credits');
      }
    },
    
    addCreditsToAllUsers: async (_, { amount, reason }, context) => {
      try {
        // TODO: Add admin authentication check
        const adminUserId = context.user?.id || null;
        return await creditHandlers.addCreditsToAllUsers(amount, reason, adminUserId);
      } catch (error) {
        console.error('❌ Error adding credits to all users:', error);
        throw new Error('Failed to add credits to all users');
      }
    },
    
    applyCreditsToOrder: async (_, { orderId, amount }, context) => {
      try {
        const userId = context.user?.id;
        if (!userId) {
          throw new Error('Authentication required');
        }
        return await creditHandlers.applyCreditsToOrder(orderId, amount, userId);
      } catch (error) {
        console.error('❌ Error applying credits to order:', error);
        throw new Error('Failed to apply credits');
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
  resolvers
});

// 4. Start server with Express + Apollo
async function startServer() {
  try {
    await server.start();

    // Apply Apollo middleware with context function
    app.use(
      '/graphql',
      cors(),
      json(),
      expressMiddleware(server, {
        context: async ({ req }) => {
          // Extract auth token from header
          const token = req.headers.authorization?.replace('Bearer ', '');
          
          let user = null;
          if (token && supabaseClient.isReady()) {
            try {
              const client = supabaseClient.getServiceClient();
              // Verify the JWT token with Supabase
              const { data: { user: authUser }, error } = await client.auth.getUser(token);
              
              if (!error && authUser) {
                user = authUser;
                console.log('✅ Authenticated user:', authUser.email);
              } else {
                console.log('⚠️ Invalid auth token');
              }
            } catch (error) {
              console.error('Auth verification error:', error);
            }
          }
          
          return {
            supabase: supabaseClient,
            stripe: stripeClient,
            user
          };
        },
      })
    );

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
