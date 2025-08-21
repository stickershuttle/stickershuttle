import { gql, useApolloClient } from '@apollo/client';
import { useState } from 'react';

// Stripe Connect account management mutations
export const CREATE_STRIPE_CONNECT_ACCOUNT = gql`
  mutation CreateStripeConnectAccount($creatorId: ID!) {
    createStripeConnectAccount(creatorId: $creatorId) {
      success
      message
      creator {
        id
        stripeAccountId
        stripeAccountStatus
        stripeOnboardingUrl
        stripeDashboardUrl
        stripeChargesEnabled
        stripePayoutsEnabled
        stripeRequirementsPastDue
        stripeRequirementsCurrentlyDue
        stripeRequirementsEventuallyDue
        stripeRequirementsDisabledReason
        commissionRate
        payoutSchedule
        totalPayouts
        pendingPayouts
      }
      onboardingUrl
      dashboardUrl
      error
    }
  }
`;

export const COMPLETE_STRIPE_CONNECT_ONBOARDING = gql`
  mutation CompleteStripeConnectOnboarding($creatorId: ID!, $accountId: String!) {
    completeStripeConnectOnboarding(creatorId: $creatorId, accountId: $accountId) {
      success
      message
      creator {
        id
        stripeAccountId
        stripeAccountStatus
        stripeOnboardingUrl
        stripeDashboardUrl
        stripeChargesEnabled
        stripePayoutsEnabled
        stripeRequirementsPastDue
        stripeRequirementsCurrentlyDue
        stripeRequirementsEventuallyDue
        stripeRequirementsDisabledReason
        commissionRate
        payoutSchedule
        totalPayouts
        pendingPayouts
      }
      dashboardUrl
      error
    }
  }
`;

export const REFRESH_STRIPE_CONNECT_ACCOUNT = gql`
  mutation RefreshStripeConnectAccount($creatorId: ID!) {
    refreshStripeConnectAccount(creatorId: $creatorId) {
      success
      message
      creator {
        id
        stripeAccountId
        stripeAccountStatus
        stripeOnboardingUrl
        stripeDashboardUrl
        stripeChargesEnabled
        stripePayoutsEnabled
        stripeRequirementsPastDue
        stripeRequirementsCurrentlyDue
        stripeRequirementsEventuallyDue
        stripeRequirementsDisabledReason
        commissionRate
        payoutSchedule
        totalPayouts
        pendingPayouts
      }
      dashboardUrl
      error
    }
  }
`;

// Query for creator payouts
export const GET_CREATOR_PAYOUTS = gql`
  query GetCreatorPayouts($creatorId: ID!, $limit: Int, $offset: Int) {
    getCreatorPayouts(creatorId: $creatorId, limit: $limit, offset: $offset) {
      success
      payouts {
        id
        creatorId
        stripePayoutId
        stripeAccountId
        amount
        currency
        status
        arrivalDate
        description
        failureCode
        failureMessage
        createdAt
        updatedAt
      }
      totalCount
      totalAmount
      error
    }
  }
`;

// Query for creator earnings
export const GET_CREATOR_EARNINGS = gql`
  query GetCreatorEarnings($creatorId: ID!, $limit: Int, $offset: Int) {
    getCreatorEarnings(creatorId: $creatorId, limit: $limit, offset: $offset) {
      success
      earnings {
        id
        creatorId
        orderId
        marketplaceProductId
        stripePaymentIntentId
        stripeTransferId
        grossAmount
        commissionRate
        platformFee
        creatorEarnings
        stripeFee
        netEarnings
        currency
        status
        transferredAt
        createdAt
        updatedAt
      }
      totalCount
      totalEarnings
      pendingEarnings
      error
    }
  }
`;

// Hook for managing Stripe Connect account
export const useStripeConnect = () => {
  const client = useApolloClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const createAccount = async (creatorId) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await client.mutate({
        mutation: CREATE_STRIPE_CONNECT_ACCOUNT,
        variables: { creatorId }
      });
      
      return result.data.createStripeConnectAccount;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const completeOnboarding = async (creatorId, accountId) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await client.mutate({
        mutation: COMPLETE_STRIPE_CONNECT_ONBOARDING,
        variables: { creatorId, accountId }
      });
      
      return result.data.completeStripeConnectOnboarding;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  const refreshAccount = async (creatorId) => {
    setLoading(true);
    setError(null);
    
    try {
      const result = await client.mutate({
        mutation: REFRESH_STRIPE_CONNECT_ACCOUNT,
        variables: { creatorId }
      });
      
      return result.data.refreshStripeConnectAccount;
    } catch (err) {
      setError(err.message);
      return { success: false, error: err.message };
    } finally {
      setLoading(false);
    }
  };

  return {
    createAccount,
    completeOnboarding,
    refreshAccount,
    loading,
    error
  };
};

// Admin mutations for creator payment management
export const RETRY_FAILED_CREATOR_PAYMENTS = gql`
  mutation RetryFailedCreatorPayments($orderId: ID!) {
    retryFailedCreatorPayments(orderId: $orderId) {
      success
      retriedCreators
      results {
        success
        creatorId
        creatorName
        transferId
        amount
        error
      }
      message
      error
    }
  }
`;

export const UPDATE_CREATOR_COMMISSION_RATE = gql`
  mutation UpdateCreatorCommissionRate($creatorId: ID!, $commissionRate: Float!) {
    updateCreatorCommissionRate(creatorId: $creatorId, commissionRate: $commissionRate) {
      success
      message
      creator {
        id
        creatorName
        commissionRate
        stripeAccountStatus
        stripeChargesEnabled
        stripePayoutsEnabled
        totalPayouts
        pendingPayouts
      }
    }
  }
`;
