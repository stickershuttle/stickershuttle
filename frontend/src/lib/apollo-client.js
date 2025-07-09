import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { from } from '@apollo/client';
import { getSupabase } from './supabase';

// Production API URL on Railway
const PRODUCTION_API_URL = 'https://ss-beyond.up.railway.app';

// Use production URL by default, fallback to localhost in development
const getApiUrl = () => {
  // If explicit environment variable is set, use it
  if (process.env.NEXT_PUBLIC_API_URL) {
    // Using environment variable API URL
    return process.env.NEXT_PUBLIC_API_URL;
  }
  
  // If in development mode, use localhost
  if (process.env.NODE_ENV === 'development') {
    // Development mode: using localhost API
    return 'http://localhost:4000';
  }
  
  // Otherwise use production URL (Railway backend)
  // Production mode: using Railway backend
  return PRODUCTION_API_URL;
};

const httpLink = createHttpLink({
  uri: `${getApiUrl()}/graphql`,
});

// Auth link to add authorization header
const authLink = setContext(async (_, { headers }) => {
  try {
    const supabase = getSupabase();
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
// Apollo Client configured

// Clear cache in development to avoid stale error states
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  client.clearStore().catch(console.error);
      // Apollo cache cleared for development
}

// Clear cache on production if there's a cache version mismatch
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'production') {
  const CACHE_VERSION = '1.0.1'; // Increment this to force cache clear
  const storedVersion = localStorage.getItem('apollo-cache-version');
  
  if (storedVersion !== CACHE_VERSION) {
    console.log('🧹 Clearing Apollo cache due to version mismatch');
    client.clearStore().then(() => {
      localStorage.setItem('apollo-cache-version', CACHE_VERSION);
      console.log('✅ Apollo cache cleared and version updated');
    }).catch(error => {
      console.error('❌ Failed to clear Apollo cache:', error);
    });
  }
}

// Add a method to clear the cache
export const clearApolloCache = () => {
  console.log('🧹 Clearing Apollo cache...');
  client.clearStore();
};

export default client; 