import { gql } from '@apollo/client';

// Profile mutations for user management - Updated to clear build cache

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
  mutation CreateUserProfile($userId: ID!, $firstName: String, $lastName: String, $companyName: String, $phoneNumber: String, $companyWebsite: String) {
    createUserProfile(userId: $userId, firstName: $firstName, lastName: $lastName, companyName: $companyName, phoneNumber: $phoneNumber, companyWebsite: $companyWebsite) {
      success
      message
      userProfile {
        id
        userId
        firstName
        lastName
        companyName
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
      companyName
      isWholesaleCustomer
      wholesaleCreditRate
      wholesaleMonthlyCustomers
      wholesaleOrderingFor
      wholesaleFitExplanation
      isTaxExempt
      taxExemptId
      taxExemptReason
      taxExemptExpiresAt
      taxExemptUpdatedAt
      taxExemptUpdatedBy
      isProMember
      proStatus
      proPlan
      proStripeSubscriptionId
      proStripeCustomerId
      proSubscriptionStartDate
      proCurrentPeriodStart
      proCurrentPeriodEnd
      proDesignApproved
      proCurrentDesignFile
      proDesignApprovedAt
      proDesignLocked
      proDesignLockedAt
      proDefaultShippingAddress
      proShippingAddressUpdatedAt
      proPaymentFailed
      proLastPaymentFailure
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

// Create wholesale user profile (for wholesale signups)
export const CREATE_WHOLESALE_USER_PROFILE = gql`
  mutation CreateWholesaleUserProfile($userId: ID!, $input: WholesaleUserProfileInput!) {
    createWholesaleUserProfile(userId: $userId, input: $input) {
      success
      message
      userProfile {
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
        createdAt
        updatedAt
      }
    }
  }
`;

// Update wholesale status
export const UPDATE_WHOLESALE_STATUS = gql`
  mutation UpdateWholesaleStatus($userId: ID!, $isWholesaleCustomer: Boolean!, $wholesaleCreditRate: Float) {
    updateWholesaleStatus(userId: $userId, isWholesaleCustomer: $isWholesaleCustomer, wholesaleCreditRate: $wholesaleCreditRate) {
      success
      message
      userProfile {
        id
        userId
        isWholesaleCustomer
        wholesaleCreditRate
        updatedAt
      }
    }
  }
`;

// Update tax exemption status
export const UPDATE_TAX_EXEMPTION = gql`
  mutation UpdateTaxExemption($userId: ID!, $input: TaxExemptionInput!) {
    updateTaxExemption(userId: $userId, input: $input) {
      success
      message
      userProfile {
        id
        userId
        firstName
        lastName
        companyName
        isTaxExempt
        taxExemptId
        taxExemptReason
        taxExemptExpiresAt
        taxExemptUpdatedAt
        taxExemptUpdatedBy
        updatedAt
      }
    }
  }
`;

// Update creator status
export const UPDATE_CREATOR_STATUS = gql`
  mutation UpdateCreatorStatus($userId: ID!, $isCreator: Boolean!) {
    updateCreatorStatus(userId: $userId, isCreator: $isCreator) {
      success
      message
      creator {
        id
        userId
        creatorName
        email
        isActive
        totalProducts
        createdAt
        updatedAt
      }
    }
  }
`;

// Get creator by user ID
export const GET_CREATOR_BY_USER_ID = gql`
  query GetCreatorByUserId($userId: ID!) {
    getCreatorByUserId(userId: $userId) {
      id
      userId
      creatorName
      email
      isActive
      totalProducts
      createdAt
      updatedAt
    }
  }
`;

// Get creator sales statistics
export const GET_CREATOR_SALES_STATS = gql`
  query GetCreatorSalesStats($creatorId: ID!, $dateRange: String) {
    getCreatorSalesStats(creatorId: $creatorId, dateRange: $dateRange) {
      totalSales
      totalRevenue
      totalProducts
      soldProducts {
        id
        name
        imageUrl
        totalSold
        totalRevenue
        price
      }
      recentSales {
        id
        productName
        quantity
        price
        soldAt
        orderNumber
        shippingCity
      }
      quantityBreakdown {
        quantity
        orderCount
        totalSold
        revenue
        totalProfit
      }
      customFivePackCount
    }
  }
`;

// Admin password change mutation
export const ADMIN_CHANGE_USER_PASSWORD = gql`
  mutation AdminChangeUserPassword($userId: ID!, $newPassword: String!) {
    adminChangeUserPassword(userId: $userId, newPassword: $newPassword) {
      success
      message
      error
    }
  }
`;

// Update Pro member shipping address
export const UPDATE_PRO_SHIPPING_ADDRESS = gql`
  mutation UpdateProMemberShippingAddress($userId: ID!, $shippingAddress: AddressInput!) {
    updateProMemberShippingAddress(userId: $userId, shippingAddress: $shippingAddress) {
      success
      message
      userProfile {
        id
        userId
        firstName
        lastName
        email
        isProMember
        proDefaultShippingAddress
        proShippingAddressUpdatedAt
        updatedAt
      }
    }
  }
`; 