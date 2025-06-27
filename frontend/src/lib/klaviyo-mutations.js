import { gql } from '@apollo/client';

// Subscribe customer to Klaviyo
export const SUBSCRIBE_TO_KLAVIYO = gql`
  mutation SubscribeToKlaviyo($email: String!, $listId: String) {
    subscribeToKlaviyo(email: $email, listId: $listId) {
      success
      message
      profileId
    }
  }
`;

// Unsubscribe customer from Klaviyo
export const UNSUBSCRIBE_FROM_KLAVIYO = gql`
  mutation UnsubscribeFromKlaviyo($email: String!, $listId: String) {
    unsubscribeFromKlaviyo(email: $email, listId: $listId) {
      success
      message
      profileId
    }
  }
`;

// Sync customer to Klaviyo
export const SYNC_CUSTOMER_TO_KLAVIYO = gql`
  mutation SyncCustomerToKlaviyo($customerData: KlaviyoCustomerInput!) {
    syncCustomerToKlaviyo(customerData: $customerData) {
      success
      message
      error
    }
  }
`;

// Bulk sync customers to Klaviyo
export const BULK_SYNC_CUSTOMERS_TO_KLAVIYO = gql`
  mutation BulkSyncCustomersToKlaviyo($customers: [KlaviyoCustomerInput!]!) {
    bulkSyncCustomersToKlaviyo(customers: $customers) {
      success
      failed
      errors {
        email
        error
      }
    }
  }
`;

// Update customer subscription status (both local DB and Klaviyo)
export const UPDATE_CUSTOMER_SUBSCRIPTION = gql`
  mutation UpdateCustomerSubscription($email: String!, $subscribed: Boolean!) {
    updateCustomerSubscription(email: $email, subscribed: $subscribed) {
      success
      message
      customer {
        id
        email
        marketingOptIn
      }
    }
  }
`;

// Get Klaviyo subscription status
export const GET_KLAVIYO_SUBSCRIPTION_STATUS = gql`
  query GetKlaviyoSubscriptionStatus($email: String!, $listId: String) {
    getKlaviyoSubscriptionStatus(email: $email, listId: $listId) {
      isSubscribed
      profileId
      error
    }
  }
`;

// Track Klaviyo event
export const TRACK_KLAVIYO_EVENT = gql`
  mutation TrackKlaviyoEvent($email: String!, $eventName: String!, $properties: JSON) {
    trackKlaviyoEvent(email: $email, eventName: $eventName, properties: $properties) {
      success
      message
      error
    }
  }
`;

// Get all Klaviyo lists
export const GET_KLAVIYO_LISTS = gql`
  query GetKlaviyoLists {
    getKlaviyoLists {
      id
      name
      created
      updated
    }
  }
`;

export const GET_KLAVIYO_CONFIGURED_LISTS = gql`
  query GetKlaviyoConfiguredLists {
    getKlaviyoConfiguredLists {
      success
      lists {
        id
        name
        type
        configured
      }
      error
    }
  }
`;

export const GET_KLAVIYO_PROFILES = gql`
  query GetKlaviyoProfiles($limit: Int, $cursor: String) {
    getKlaviyoProfiles(limit: $limit, cursor: $cursor) {
      success
      profiles {
        id
        email
        firstName
        lastName
        phone
        city
        state
        country
        totalOrders
        totalSpent
        averageOrderValue
        firstOrderDate
        lastOrderDate
        createdAt
        updatedAt
      }
      nextCursor
      total
      error
    }
  }
`;

export const GET_KLAVIYO_PROFILES_FROM_ALL_LISTS = gql`
  query GetKlaviyoProfilesFromAllLists($limit: Int) {
    getKlaviyoProfilesFromAllLists(limit: $limit) {
      success
      profiles {
        id
        email
        firstName
        lastName
        phone
        city
        state
        country
        totalOrders
        totalSpent
        averageOrderValue
        firstOrderDate
        lastOrderDate
        createdAt
        updatedAt
        listMembership
      }
      totalProfiles
      uniqueProfiles
      profilesByList {
        listType
        listId
        count
      }
      errors {
        listType
        listId
        error
      }
    }
  }
`;

export const GET_ALL_KLAVIYO_PROFILES = gql`
  query GetAllKlaviyoProfiles($limit: Int) {
    getAllKlaviyoProfiles(limit: $limit) {
      success
      profiles {
        id
        email
        firstName
        lastName
        phone
        city
        state
        country
        totalOrders
        totalSpent
        averageOrderValue
        firstOrderDate
        lastOrderDate
        createdAt
        updatedAt
        sources
      }
      totalProfiles
      uniqueProfiles
      profilesBySource {
        sourceName
        sourceId
        sourceType
        count
      }
      errors {
        error
      }
    }
  }
`;

// Sync all customers to Klaviyo (admin only)
export const SYNC_ALL_CUSTOMERS_TO_KLAVIYO = gql`
  mutation SyncAllCustomersToKlaviyo {
    syncAllCustomersToKlaviyo {
      success
      failed
      total
      errors {
        email
        error
      }
    }
  }
`; 