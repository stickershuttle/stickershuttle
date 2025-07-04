import { gql } from '@apollo/client';

// Get user's current credit balance
export const GET_USER_CREDIT_BALANCE = gql`
  query GetUserCreditBalance($userId: String!) {
    getUserCreditBalance(userId: $userId) {
      balance
      transactionCount
      lastTransactionDate
    }
  }
`;

// Get unread credit notifications
export const GET_UNREAD_CREDIT_NOTIFICATIONS = gql`
  query GetUnreadCreditNotifications($userId: String!) {
    getUnreadCreditNotifications(userId: $userId) {
      id
      amount
      reason
    }
  }
`;

// Mark credit notifications as read
export const MARK_CREDIT_NOTIFICATIONS_READ = gql`
  mutation MarkCreditNotificationsRead($userId: String!) {
    markCreditNotificationsRead(userId: $userId) {
      success
    }
  }
`;

// Admin: Add credits to a user
export const ADD_USER_CREDITS = gql`
  mutation AddUserCredits($input: AddUserCreditsInput!) {
    addUserCredits(input: $input) {
      success
      credit {
        id
        userId
        amount
        reason
        createdAt
      }
      error
    }
  }
`;

// Admin: Add credits to all users
export const ADD_CREDITS_TO_ALL_USERS = gql`
  mutation AddCreditsToAllUsers($amount: Float!, $reason: String!) {
    addCreditsToAllUsers(amount: $amount, reason: $reason) {
      success
      usersUpdated
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

// Admin: Get user credit history
export const GET_USER_CREDIT_HISTORY = gql`
  query GetUserCreditHistory($userId: String!) {
    getUserCreditHistory(userId: $userId) {
      transactions {
        id
        amount
        balance
        reason
        transactionType
        orderId
        createdAt
        expiresAt
      }
      currentBalance
    }
  }
`;

// Admin: Get all users
export const GET_ALL_USERS = gql`
  query GetAllUsers {
    getAllUsers {
      id
      email
      firstName
      lastName
      company
      createdAt
      lastSignIn
    }
  }
`;

// Apply credits at checkout
export const APPLY_CREDITS_TO_ORDER = gql`
  mutation ApplyCreditsToOrder($orderId: ID!, $amount: Float!) {
    applyCreditsToOrder(orderId: $orderId, amount: $amount) {
      success
      remainingBalance
      error
    }
  }
`;

// Get earned points/credits per order for the user
export const GET_USER_EARNED_CREDITS_BY_ORDER = gql`
  query GetUserEarnedCreditsByOrder($userId: String!) {
    getUserCreditHistory(userId: $userId) {
      transactions {
        id
        amount
        reason
        transactionType
        orderId
        orderNumber
        createdAt
      }
    }
  }
`;

// Restore credits for abandoned checkout
export const RESTORE_CREDITS_FOR_ABANDONED_CHECKOUT = gql`
  mutation RestoreCreditsForAbandonedCheckout($sessionId: String!, $reason: String) {
    restoreCreditsForAbandonedCheckout(sessionId: $sessionId, reason: $reason) {
      success
      restoredCredits
      restoredOrders
      message
      error
    }
  }
`;

// Cleanup abandoned checkouts
export const CLEANUP_ABANDONED_CHECKOUTS = gql`
  mutation CleanupAbandonedCheckouts($maxAgeHours: Int) {
    cleanupAbandonedCheckouts(maxAgeHours: $maxAgeHours) {
      success
      totalRestored
      restoredSessions
      message
      error
    }
  }
`; 