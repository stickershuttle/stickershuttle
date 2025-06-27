import { gql } from '@apollo/client';

// Query to get team emails
export const GET_TEAM_EMAILS = gql`
  query GetTeamEmails($userId: ID!) {
    getTeamEmails(userId: $userId) {
      id
      email
      role
      permissions
      isVerified
      verifiedAt
      lastLoginAt
      invitedAt
    }
  }
`;

// Mutation to add team email
export const ADD_TEAM_EMAIL = gql`
  mutation AddTeamEmail($email: String!) {
    addTeamEmail(email: $email) {
      success
      message
      teamEmail {
        id
        email
        isVerified
        invitedAt
      }
      verificationToken
    }
  }
`;

// Mutation to remove team email
export const REMOVE_TEAM_EMAIL = gql`
  mutation RemoveTeamEmail($email: String!) {
    removeTeamEmail(email: $email) {
      success
      message
    }
  }
`;

// Mutation to update team email permissions
export const UPDATE_TEAM_EMAIL_PERMISSIONS = gql`
  mutation UpdateTeamEmailPermissions($email: String!, $role: String, $permissions: JSON) {
    updateTeamEmailPermissions(email: $email, role: $role, permissions: $permissions) {
      success
      message
    }
  }
`;

// Mutation to resend verification email
export const RESEND_VERIFICATION_EMAIL = gql`
  mutation ResendVerificationEmail($email: String!) {
    resendVerificationEmail(email: $email) {
      success
      message
    }
  }
`;

// Query to verify team email
export const VERIFY_TEAM_EMAIL = gql`
  query VerifyTeamEmail($token: String!) {
    verifyTeamEmail(token: $token) {
      success
      message
      primaryUserId
    }
  }
`; 