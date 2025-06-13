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