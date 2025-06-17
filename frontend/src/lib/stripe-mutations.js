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
        orderStatus
        totalPrice
        orderCreatedAt
      }
      message
      errors
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