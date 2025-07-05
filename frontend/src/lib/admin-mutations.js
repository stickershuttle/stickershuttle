import { gql } from '@apollo/client';

// Delete users mutation (admin only)
export const DELETE_USERS = gql`
  mutation DeleteUsers($userIds: [String!]!) {
    deleteUsers(userIds: $userIds) {
      success
      deletedCount
      errors {
        userId
        error
      }
    }
  }
`;

// Get user details for confirmation
export const GET_USER_DETAILS = gql`
  query GetUserDetails($userIds: [String!]!) {
    getUserDetails(userIds: $userIds) {
      id
      email
      firstName
      lastName
      createdAt
      lastSignIn
      totalOrders
      totalSpent
    }
  }
`;

// Backup user data before deletion
export const BACKUP_USER_DATA = gql`
  mutation BackupUserData($userId: String!) {
    backupUserData(userId: $userId) {
      success
      backupId
      error
    }
  }
`;

export const CREATE_SHARED_CART = gql`
  mutation CreateSharedCart($input: CreateSharedCartInput!) {
    createSharedCart(input: $input) {
      success
      sharedCart {
        id
        shareId
        cartData
        createdBy
        createdAt
        expiresAt
        accessCount
        lastAccessAt
      }
      shareUrl
      error
    }
  }
`;

export const GET_SHARED_CART = gql`
  query GetSharedCart($shareId: String!) {
    getSharedCart(shareId: $shareId) {
      success
      sharedCart {
        id
        shareId
        cartData
        createdBy
        createdAt
        expiresAt
        accessCount
        lastAccessAt
      }
      error
    }
  }
`;

export const GET_ALL_SHARED_CARTS = gql`
  query GetAllSharedCarts($offset: Int, $limit: Int) {
    getAllSharedCarts(offset: $offset, limit: $limit) {
      success
      sharedCarts {
        id
        shareId
        cartData
        createdBy
        createdAt
        expiresAt
        accessCount
        lastAccessAt
      }
      totalCount
      error
    }
  }
`;

// Get all wholesale customers for admin management
export const GET_ALL_WHOLESALE_CUSTOMERS = gql`
  query GetAllWholesaleCustomers {
    getAllWholesaleCustomers {
      id
      userId
      firstName
      lastName
      companyName
      isWholesaleCustomer
      wholesaleCreditRate
      wholesaleMonthlyCustomers
      wholesaleOrderingFor
      wholesaleFitExplanation
      wholesaleStatus
      wholesaleApprovedAt
      wholesaleApprovedBy
      isTaxExempt
      taxExemptId
      taxExemptReason
      taxExemptExpiresAt
      taxExemptUpdatedAt
      taxExemptUpdatedBy
      createdAt
      updatedAt
    }
  }
`;

// Get all customers for tax exemption management
export const GET_ALL_CUSTOMERS_WITH_PROFILES = gql`
  query GetAllCustomersWithProfiles {
    getAllWholesaleCustomers {
      id
      userId
      firstName
      lastName
      companyName
      isWholesaleCustomer
      isTaxExempt
      taxExemptId
      taxExemptReason
      taxExemptExpiresAt
      taxExemptUpdatedAt
      taxExemptUpdatedBy
      createdAt
      updatedAt
    }
  }
`; 