import { gql } from '@apollo/client';

export const CREATE_DRAFT_ORDER = gql`
  mutation CreateDraftOrder($input: DraftOrderInput!) {
    createDraftOrder(input: $input) {
      id
      name
      total_price
      currency
      invoice_url
      status
      line_items {
        title
        quantity
        price
        sku
      }
      customer {
        email
        first_name
        last_name
      }
    }
  }
`;

export const CREATE_CHECKOUT_URL = gql`
  mutation CreateCheckoutUrl($draftOrderId: ID!) {
    createCheckoutUrl(draftOrderId: $draftOrderId) {
      checkoutUrl
      draftOrderId
      totalPrice
    }
  }
`;

export const COMPLETE_DRAFT_ORDER = gql`
  mutation CompleteDraftOrder($id: ID!) {
    completeDraftOrder(id: $id) {
      id
      order_id
      status
      total_price
    }
  }
`;

// NEW: Process cart order with user context and create Supabase records
export const PROCESS_CART_ORDER = gql`
  mutation ProcessCartOrder($input: CartOrderInput!) {
    processCartOrder(input: $input) {
      success
      message
      errors
      customerOrder {
        id
        userId
        shopifyOrderId
        shopifyOrderNumber
        orderStatus
        totalPrice
        orderCreatedAt
      }
      shopifyOrder {
        id
        name
        total_price
        currency
        invoice_url
        status
      }
    }
  }
`;

// NEW: Get user orders for dashboard
export const GET_USER_ORDERS = gql`
  query GetUserOrders($userId: ID!) {
    getUserOrders(userId: $userId) {
      id
      userId
      shopifyOrderId
      shopifyOrderNumber
      orderStatus
      fulfillmentStatus
      financialStatus
      trackingNumber
      trackingCompany
      trackingUrl
      subtotalPrice
      totalTax
      totalPrice
      currency
      customerFirstName
      customerLastName
      customerEmail
      customerPhone
      shippingAddress
      billingAddress
      orderTags
      orderNote
      orderCreatedAt
      orderUpdatedAt
      createdAt
      updatedAt
      items {
        id
        productId
        productName
        productCategory
        sku
        quantity
        unitPrice
        totalPrice
        calculatorSelections
        customFiles
        customerNotes
        instagramHandle
        instagramOptIn
        fulfillmentStatus
        createdAt
        updatedAt
      }
    }
  }
`;

// NEW: Get single order by ID for invoice
export const GET_ORDER_BY_ID = gql`
  query GetOrderById($id: ID!) {
    getOrderById(id: $id) {
      id
      userId
      guestEmail
      shopifyOrderId
      shopifyOrderNumber
      orderStatus
      fulfillmentStatus
      financialStatus
      trackingNumber
      trackingCompany
      trackingUrl
      subtotalPrice
      totalTax
      totalPrice
      currency
      customerFirstName
      customerLastName
      customerEmail
      customerPhone
      shippingAddress
      billingAddress
      orderTags
      orderNote
      orderCreatedAt
      orderUpdatedAt
      createdAt
      updatedAt
      items {
        id
        customerOrderId
        shopifyLineItemId
        productId
        productName
        productCategory
        sku
        quantity
        unitPrice
        totalPrice
        calculatorSelections
        customFiles
        customerNotes
        instagramHandle
        instagramOptIn
        fulfillmentStatus
        createdAt
        updatedAt
      }
    }
  }
`;

// NEW: Claim guest orders when user logs in
export const CLAIM_GUEST_ORDERS = gql`
  mutation ClaimGuestOrders($userId: ID!, $email: String!) {
    claimGuestOrders(userId: $userId, email: $email) {
      success
      claimedOrdersCount
      message
    }
  }
`;

// NEW: Sync Shopify orders for user
export const SYNC_SHOPIFY_ORDERS = gql`
  query SyncShopifyOrders($userId: ID!, $email: String!) {
    syncShopifyOrders(userId: $userId, email: $email) {
      success
      synced
      total
      message
    }
  }
`;

export const GET_ALL_DRAFT_ORDERS = gql`
  query GetAllDraftOrders($limit: Int, $status: String) {
    getAllDraftOrders(limit: $limit, status: $status) {
      id
      name
      total_price
      status
      created_at
      customer {
        email
        first_name
        last_name
      }
      line_items {
        title
        quantity
        price
      }
    }
  }
`; 