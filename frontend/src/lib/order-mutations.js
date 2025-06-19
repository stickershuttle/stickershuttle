import { gql } from '@apollo/client';

// Query to get user orders
export const GET_USER_ORDERS = gql`
  query GetUserOrders($userId: ID!) {
    getUserOrders(userId: $userId) {
      id
      userId
      guestEmail
      stripePaymentIntentId
      stripeCheckoutSessionId
      orderNumber
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
      proof_status
      proof_sent_at
      proof_link
      items {
        id
        customerOrderId
        stripeLineItemId
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
      proofs {
        id
        proofUrl
        proofPublicId
        proofTitle
        uploadedAt
        uploadedBy
        status
        customerNotes
        adminNotes
      }
    }
  }
`;

// Query to get order by number
export const GET_ORDER_BY_NUMBER = gql`
  query GetOrderByNumber($orderNumber: String!) {
    getOrderByNumber(orderNumber: $orderNumber) {
      id
      userId
      guestEmail
      stripePaymentIntentId
      stripeCheckoutSessionId
      orderNumber
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
      proof_status
      proof_sent_at
      proof_link
      items {
        id
        customerOrderId
        stripeLineItemId
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
      proofs {
        id
        proofUrl
        proofPublicId
        proofTitle
        uploadedAt
        uploadedBy
        status
        customerNotes
        adminNotes
      }
    }
  }
`;

// Query to get order by ID
export const GET_ORDER_BY_ID = gql`
  query GetOrderById($id: ID!) {
    getOrderById(id: $id) {
      id
      userId
      guestEmail
      stripePaymentIntentId
      stripeCheckoutSessionId
      orderNumber
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
      proof_status
      proof_sent_at
      proof_link
      items {
        id
        customerOrderId
        stripeLineItemId
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
      proofs {
        id
        proofUrl
        proofPublicId
        proofTitle
        uploadedAt
        uploadedBy
        status
        customerNotes
        adminNotes
      }
    }
  }
`;

// Mutation to claim guest orders
export const CLAIM_GUEST_ORDERS = gql`
  mutation ClaimGuestOrders($userId: ID!, $email: String!) {
    claimGuestOrders(userId: $userId, email: $email) {
      success
      claimedOrdersCount
      message
    }
  }
`;

// Mutation to update order status
export const UPDATE_ORDER_STATUS = gql`
  mutation UpdateOrderStatus($orderId: String!, $statusUpdate: OrderStatusInput!) {
    updateOrderStatus(orderId: $orderId, statusUpdate: $statusUpdate) {
      id
      orderStatus
      fulfillmentStatus
      financialStatus
      trackingNumber
      trackingCompany
      trackingUrl
    }
  }
`; 