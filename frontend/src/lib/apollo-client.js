import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { from } from '@apollo/client';

const httpLink = createHttpLink({
  uri: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000',
});

// Error link to log GraphQL errors
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(`❌ GraphQL error: Message: ${message}, Location: ${locations}, Path: ${path}`);
    });
  }

  if (networkError) {
    console.error(`❌ Network error: ${networkError}`);
  }
});

const client = new ApolloClient({
  link: from([errorLink, httpLink]),
  cache: new InMemoryCache({
    // TEMP FIX: More aggressive cache policies to fix order number display issue
    typePolicies: {
      Query: {
        fields: {
          getUserOrders: {
            // Always fetch fresh order data
            fetchPolicy: 'network-only'
          }
        }
      },
      CustomerOrder: {
        // Force cache refresh for order data
        fields: {
          shopifyOrderNumber: {
            merge: false // Don't merge cached data
          },
          shopifyOrderId: {
            merge: false // Don't merge cached data
          }
        }
      }
    }
  }),
  defaultOptions: {
    watchQuery: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-and-network', // Balanced approach: check cache first, then network
    },
    query: {
      errorPolicy: 'all',
      fetchPolicy: 'cache-and-network', // Balanced approach: check cache first, then network
    },
  },
});

console.log('🔗 Apollo Client configured with URI:', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000');

// Clear cache in development to avoid stale error states
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  client.clearStore().catch(console.error);
  console.log('🧹 Apollo cache cleared for development');
}

export default client; 