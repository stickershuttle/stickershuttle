import { gql } from '@apollo/client';

// Get wholesale analytics data
export const GET_WHOLESALE_ANALYTICS = gql`
  query GetWholesaleAnalytics {
    getWholesaleAnalytics {
      totalWholesaleCustomers
      totalWholesaleRevenue
      averageOrderValue
      totalOrders
      monthlyRevenue
      monthlyOrders
      growthRate
      creditRateDistribution {
        creditRate
        customerCount
        percentage
      }
    }
  }
`;

// Get wholesale top performers
export const GET_WHOLESALE_TOP_PERFORMERS = gql`
  query GetWholesaleTopPerformers($limit: Int) {
    getWholesaleTopPerformers(limit: $limit) {
      id
      userId
      firstName
      lastName
      companyName
      totalOrders
      totalRevenue
      averageOrderValue
      creditRate
      lastOrderDate
      monthlyRevenue
    }
  }
`;

// Update wholesale customer
export const UPDATE_WHOLESALE_CUSTOMER = gql`
  mutation UpdateWholesaleCustomer($userId: ID!, $input: UpdateWholesaleCustomerInput!) {
    updateWholesaleCustomer(userId: $userId, input: $input) {
      success
      message
      userProfile {
        id
        userId
        firstName
        lastName
        companyName
        wholesaleCreditRate
        wholesaleMonthlyCustomers
        wholesaleOrderingFor
        wholesaleFitExplanation
        wholesaleStatus
        wholesaleApprovedAt
        wholesaleApprovedBy
        createdAt
        updatedAt
      }
    }
  }
`; 