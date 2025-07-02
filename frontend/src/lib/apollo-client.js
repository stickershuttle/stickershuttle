import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { from } from '@apollo/client';
import { getSupabase } from './supabase';

// TEMPORARY: Use local API until Railway environment variables are configured
// Production API URL on Railway (currently down due to missing env vars)
const PRODUCTION_API_URL = 'https://stickershuttle-production.up.railway.app';

// Use production URL by default, fallback to localhost in development
const getApiUrl = () => {
  // If explicit environment variable is set, use it
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // TEMPORARY: Test if Railway backend is responding, fallback to localhost
  // This will help us determine if Railway is the issue
  
  // If in development mode, use localhost
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:4000';
  }
  
  // TEMPORARY FIX: Railway backend is down (502 error), use localhost temporarily
  // Once Railway is fixed, change this back to PRODUCTION_API_URL
  console.log('🚨 TEMPORARY: Using localhost because Railway backend is down (502 error)');
  console.log('🔧 Railway backend URL that is failing:', PRODUCTION_API_URL);
  return 'http://localhost:4000';
};

const httpLink = createHttpLink({
  uri: `${getApiUrl()}/graphql`,
});

// Auth link to add authorization header
const authLink = setContext(async (_, { headers }) => {
  try {
    const supabase = await getSupabase();
    const { data: { session } } = await supabase.auth.getSession();
    
    return {
      headers: {
        ...headers,
        authorization: session?.access_token ? `Bearer ${session.access_token}` : '',
      }
    };
  } catch (error) {
    console.error('Error getting auth token:', error);
    return { headers };
  }
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
    
    // If we're trying to connect to localhost in production, show helpful error
    if (networkError.message.includes('localhost') && process.env.NODE_ENV === 'production') {
      console.error(`🚨 Production is trying to connect to localhost! Check API URL configuration.`);
    }
  }
});

const client = new ApolloClient({
  link: from([errorLink, authLink, httpLink]),
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
      fetchPolicy: 'network-only', // Use network-only for client.query() calls
    },
  },
});

const finalApiUrl = getApiUrl();
console.log('🔗 Apollo Client configured with URI:', finalApiUrl);
console.log('🌍 Environment:', process.env.NODE_ENV);

// Clear cache in development to avoid stale error states
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  client.clearStore().catch(console.error);
  console.log('🧹 Apollo cache cleared for development');
}

// Add a method to clear the cache
export const clearApolloCache = () => {
  console.log('🧹 Clearing Apollo cache...');
  client.clearStore();
};

export default client; 