import { gql } from '@apollo/client';

// Update user profile names (for email/password signups)
export const UPDATE_USER_PROFILE_NAMES = gql`
  mutation UpdateUserProfileNames($userId: ID!, $firstName: String!, $lastName: String!) {
    updateUserProfileNames(userId: $userId, firstName: $firstName, lastName: $lastName) {
      success
      message
      userProfile {
        id
        userId
        firstName
        lastName
        updatedAt
      }
    }
  }
`;

// Create user profile (for new signups)
export const CREATE_USER_PROFILE = gql`
  mutation CreateUserProfile($userId: ID!, $firstName: String, $lastName: String) {
    createUserProfile(userId: $userId, firstName: $firstName, lastName: $lastName) {
      success
      message
      userProfile {
        id
        userId
        firstName
        lastName
        createdAt
        updatedAt
      }
    }
  }
`;

// Get user profile by user ID
export const GET_USER_PROFILE = gql`
  query GetUserProfile($userId: ID!) {
    getUserProfile(userId: $userId) {
      id
      userId
      firstName
      lastName
      displayName
      bio
      profilePhotoUrl
      bannerImageUrl
      createdAt
      updatedAt
    }
  }
`;

// Update user profile photo
export const UPDATE_USER_PROFILE_PHOTO = gql`
  mutation UpdateUserProfilePhoto($userId: ID!, $photoUrl: String!, $photoPublicId: String) {
    updateUserProfilePhoto(userId: $userId, photoUrl: $photoUrl, photoPublicId: $photoPublicId) {
      success
      message
      userProfile {
        id
        userId
        profilePhotoUrl
        profilePhotoPublicId
        updatedAt
      }
    }
  }
`;

// Update user profile banner
export const UPDATE_USER_PROFILE_BANNER = gql`
  mutation UpdateUserProfileBanner($userId: ID!, $bannerUrl: String, $bannerPublicId: String, $bannerTemplate: String, $bannerTemplateId: Int) {
    updateUserProfileBanner(userId: $userId, bannerUrl: $bannerUrl, bannerPublicId: $bannerPublicId, bannerTemplate: $bannerTemplate, bannerTemplateId: $bannerTemplateId) {
      success
      message
      userProfile {
        id
        userId
        bannerImageUrl
        bannerImagePublicId
        bannerTemplate
        bannerTemplateId
        updatedAt
      }
    }
  }
`;

// Update user profile company
export const UPDATE_USER_PROFILE_COMPANY = gql`
  mutation UpdateUserProfileCompany($userId: ID!, $companyName: String!) {
    updateUserProfileCompany(userId: $userId, companyName: $companyName) {
      success
      message
      userProfile {
        id
        userId
        companyName
        updatedAt
      }
    }
  }
`;

// Comprehensive profile update
export const UPDATE_USER_PROFILE_COMPREHENSIVE = gql`
  mutation UpdateUserProfileComprehensive($userId: ID!, $input: UserProfileInput!) {
    updateUserProfileComprehensive(userId: $userId, input: $input) {
      success
      message
      userProfile {
        id
        userId
        firstName
        lastName
        companyName
        profilePhotoUrl
        profilePhotoPublicId
        bannerImageUrl
        bannerImagePublicId
        bio
        updatedAt
      }
    }
  }
`; 