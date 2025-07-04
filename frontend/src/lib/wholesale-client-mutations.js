import { gql } from '@apollo/client';

// Get wholesale clients for a user
export const GET_WHOLESALE_CLIENTS = gql`
  query GetWholesaleClients($userId: ID!) {
    getWholesaleClients(userId: $userId) {
      id
      wholesaleUserId
      clientName
      clientEmail
      clientPhone
      clientCompany
      clientAddress
      notes
      isActive
      createdAt
      updatedAt
      orderCount
      totalSpent
    }
  }
`;

// Get orders for a specific client
export const GET_CLIENT_ORDERS = gql`
  query GetClientOrders($clientId: ID!) {
    getClientOrders(clientId: $clientId) {
      id
      orderNumber
      orderStatus
      orderCreatedAt
      totalPrice
      customerFirstName
      customerLastName
      customerEmail
      items {
        id
        productName
        quantity
        totalPrice
      }
      trackingNumber
      trackingCompany
    }
  }
`;

// Create a new wholesale client
export const CREATE_WHOLESALE_CLIENT = gql`
  mutation CreateWholesaleClient($input: CreateWholesaleClientInput!) {
    createWholesaleClient(input: $input) {
      success
      message
      client {
        id
        wholesaleUserId
        clientName
        clientEmail
        clientPhone
        clientCompany
        clientAddress
        notes
        isActive
        createdAt
        updatedAt
        orderCount
        totalSpent
      }
    }
  }
`;

// Update an existing wholesale client
export const UPDATE_WHOLESALE_CLIENT = gql`
  mutation UpdateWholesaleClient($clientId: ID!, $input: UpdateWholesaleClientInput!) {
    updateWholesaleClient(clientId: $clientId, input: $input) {
      success
      message
      client {
        id
        wholesaleUserId
        clientName
        clientEmail
        clientPhone
        clientCompany
        clientAddress
        notes
        isActive
        createdAt
        updatedAt
        orderCount
        totalSpent
      }
    }
  }
`;

// Delete a wholesale client
export const DELETE_WHOLESALE_CLIENT = gql`
  mutation DeleteWholesaleClient($clientId: ID!) {
    deleteWholesaleClient(clientId: $clientId) {
      success
      message
      client {
        id
      }
    }
  }
`; 