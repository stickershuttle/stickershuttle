import { gql } from '@apollo/client';

// Get user's current credit balance
export const GET_USER_CREDIT_BALANCE = gql`
  query GetUserCreditBalance($userId: ID!) {
    getUserCreditBalance(userId: $userId) {
      balance
      transactions {
        id
        amount
        balance
        reason
        transactionType
        createdAt
      }
    }
  }
`;

// Get unread credit notifications
export const GET_UNREAD_CREDIT_NOTIFICATIONS = gql`
  query GetUnreadCreditNotifications($userId: ID!) {
    getUnreadCreditNotifications(userId: $userId) {
      id
      userId
      creditId
      type
      title
      message
      read
      createdAt
    }
  }
`;

// Mark credit notifications as read
export const MARK_CREDIT_NOTIFICATIONS_READ = gql`
  mutation MarkCreditNotificationAsRead($notificationId: ID!) {
    markCreditNotificationAsRead(notificationId: $notificationId)
  }
`;

// Admin: Add credits to a user (updated to match backend schema)
export const ADD_USER_CREDITS = gql`
  mutation AddCredits($userId: ID!, $amount: Float!, $reason: String!, $expiresAt: String) {
    addCredits(userId: $userId, amount: $amount, reason: $reason, expiresAt: $expiresAt) {
      success
      message
      credit {
        id
        userId
        amount
        reason
        createdAt
      }
      newBalance
    }
  }
`;

// Admin: Add credits to all users (will need to add this mutation to backend)
export const ADD_CREDITS_TO_ALL_USERS = gql`
  mutation AddCreditsToAllUsers($amount: Float!, $reason: String!) {
    addCreditsToAllUsers(amount: $amount, reason: $reason) {
      success
      usersUpdated
      message
      error
    }
  }
`;

// Admin: Get all user credit transactions
export const GET_ALL_CREDIT_TRANSACTIONS = gql`
  query GetAllCreditTransactions($limit: Int, $offset: Int) {
    getAllCreditTransactions(limit: $limit, offset: $offset) {
      transactions {
        id
        userId
        userEmail
        userName
        amount
        balance
        reason
        transactionType
        orderId
        createdAt
        createdBy
        expiresAt
      }
      totalCount
    }
  }
`;

// Get user credit history
export const GET_USER_CREDIT_HISTORY = gql`
  query GetUserCreditHistory($userId: ID!, $limit: Int) {
    getUserCreditHistory(userId: $userId, limit: $limit) {
      id
      userId
      amount
      balance
      reason
      transactionType
      orderId
      createdAt
      createdBy
      expiresAt
    }
  }
`;

// Get all users for admin
export const GET_ALL_USERS = gql`
  query GetAllUsers {
    getAllUsers {
      id
      email
      firstName
      lastName
      company
      createdAt
    }
  }
`;

// Apply credits to order
export const APPLY_CREDITS_TO_ORDER = gql`
  mutation ApplyCreditsToOrder($userId: ID!, $orderId: ID!, $amount: Float!) {
    applyCreditsToOrder(userId: $userId, orderId: $orderId, amount: $amount) {
      success
      message
      credit {
        id
        userId
        amount
        reason
        createdAt
      }
      newBalance
    }
  }
`;

// Reverse credits (admin only)
export const REVERSE_CREDITS = gql`
  mutation ReverseCredits($transactionId: ID!, $reason: String!) {
    reverseCredits(transactionId: $transactionId, reason: $reason) {
      success
      message
      credit {
        id
        userId
        amount
        reason
        createdAt
      }
      newBalance
    }
  }
`;

// Validate credit application
export const VALIDATE_CREDIT_APPLICATION = gql`
  query ValidateCreditApplication($userId: ID!, $orderSubtotal: Float!, $requestedCredits: Float!) {
    validateCreditApplication(userId: $userId, orderSubtotal: $orderSubtotal, requestedCredits: $requestedCredits) {
      valid
      message
      maxApplicable
    }
  }
`;

// Fix existing earned credits (admin only)
export const FIX_EXISTING_EARNED_CREDITS = gql`
  mutation FixExistingEarnedCredits {
    fixExistingEarnedCredits {
      success
      fixed
      message
      error
    }
  }
`; 