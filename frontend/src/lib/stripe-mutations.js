import { gql } from '@apollo/client';

// Process cart order with Stripe checkout
export const PROCESS_STRIPE_CART_ORDER = gql`
  mutation ProcessStripeCartOrder($input: CartOrderInput!) {
    processStripeCartOrder(input: $input) {
      success
      sessionId
      checkoutUrl
      customerOrder {
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
        shipping_method
        is_express_shipping
        is_rush_order
        is_blind_shipment
        orderTags
        orderNote
        orderCreatedAt
        orderUpdatedAt
        createdAt
        updatedAt
        proof_status
        proof_sent_at
        proof_link
        discountCode
        discountAmount
      }
      message
      errors
      creditsApplied
      remainingCredits
    }
  }
`;

// Create a simple Stripe checkout session
export const CREATE_STRIPE_CHECKOUT_SESSION = gql`
  mutation CreateStripeCheckoutSession($input: StripeCheckoutInput!) {
    createStripeCheckoutSession(input: $input) {
      success
      sessionId
      checkoutUrl
      totalAmount
      message
      error
    }
  }
`;

// Create additional payment link for existing order
export const CREATE_ADDITIONAL_PAYMENT_LINK = gql`
  mutation CreateAdditionalPaymentLink($input: AdditionalPaymentInput!) {
    createAdditionalPaymentLink(input: $input) {
      success
      sessionId
      checkoutUrl
      message
      errors
    }
  }
`; 