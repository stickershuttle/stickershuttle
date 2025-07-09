import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Single shared Supabase client instance
let supabaseClient: any = null;

// Add function to reset the client
export const resetSupabaseClient = () => {
  console.log('🔄 Resetting Supabase client...');
  supabaseClient = null;
};

export const createClient = () => {
  if (supabaseClient) {
    return supabaseClient;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  console.log('🔧 Creating Supabase client with:', {
    url: url ? url.substring(0, 30) + '...' : 'MISSING',
    keyLength: key ? key.length : 0,
    hasUrl: !!url,
    hasKey: !!key,
    timestamp: new Date().toISOString()
  });
  
  if (!url || !key) {
    console.error('❌ Missing Supabase environment variables!');
    console.error('URL:', url);
    console.error('Key exists:', !!key);
    throw new Error('Supabase configuration missing');
  }
  
  try {
    // Create client with localStorage for session persistence
    supabaseClient = createSupabaseClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: {
          getItem: (key: string) => {
            if (typeof window === 'undefined') {
              return null;
            }
            try {
              return window.localStorage.getItem(key);
            } catch (e) {
              console.error('❌ localStorage.getItem error:', e);
              return null;
            }
          },
          setItem: (key: string, value: string) => {
            if (typeof window === 'undefined') {
              return;
            }
            try {
              window.localStorage.setItem(key, value);
            } catch (e) {
              console.error('❌ localStorage.setItem error:', e);
            }
          },
          removeItem: (key: string) => {
            if (typeof window === 'undefined') {
              return;
            }
            try {
              window.localStorage.removeItem(key);
            } catch (e) {
              console.error('❌ localStorage.removeItem error:', e);
            }
          }
        }
      }
    });
    
    console.log('✅ Supabase client created successfully');
    
    // Test the client immediately
    supabaseClient.auth.getSession().then(({ data, error }: any) => {
      if (error) {
        console.error('❌ Initial session check error:', error);
      } else {
        console.log('✅ Initial session check successful:', !!data.session);
      }
    }).catch((err: any) => {
      console.error('❌ Initial session check failed:', err);
    });
    
    return supabaseClient;
  } catch (error) {
    console.error('❌ Failed to create Supabase client:', error);
    throw error;
  }
}; 