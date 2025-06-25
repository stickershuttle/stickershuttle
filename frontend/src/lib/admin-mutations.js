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