// Using CDN approach to bypass npm module resolution issues - Latest version
declare global {
  interface Window {
    supabase: any;
  }
}

let supabaseClient: any = null;

export async function getSupabase() {
  if (typeof window === 'undefined') {
    // Server-side: return a mock for SSR
    return {
      auth: {
        signUp: () => Promise.resolve({ data: null, error: new Error('SSR Mock') }),
        signInWithPassword: () => Promise.resolve({ data: null, error: new Error('SSR Mock') }),
        getSession: () => Promise.resolve({ data: { session: null } }),
      }
    };
  }

  if (!supabaseClient) {
    // Load Supabase from CDN (latest version)
    if (!window.supabase) {
      await loadSupabaseFromCDN();
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    // Check if we have placeholder values
    const hasPlaceholderValues = 
      supabaseUrl === 'your_supabase_url' || 
      supabaseAnonKey === 'your_supabase_anon_key' ||
      !supabaseUrl || 
      !supabaseAnonKey;
    
    if (hasPlaceholderValues) {
      console.warn('Supabase not configured - using mock client for development');
      return {
        auth: {
          signUp: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
          signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
          getSession: () => Promise.resolve({ data: { session: null } }),
          signOut: () => Promise.resolve({ error: null }),
        },
        from: () => ({
          select: () => Promise.resolve({ data: [], error: null }),
          insert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
          update: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        }),
      };
    }
    
    try {
      supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
    } catch (error) {
      console.error('Failed to create Supabase client:', error);
      console.error('URL:', supabaseUrl);
      console.error('Key:', supabaseAnonKey ? 'Set (hidden)' : 'Not set');
      
      // Return a mock client for development/testing
      console.warn('Returning mock Supabase client for development');
      return {
        auth: {
          signUp: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
          signInWithPassword: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
          getSession: () => Promise.resolve({ data: { session: null } }),
          signOut: () => Promise.resolve({ error: null }),
        },
        from: () => ({
          select: () => Promise.resolve({ data: [], error: null }),
          insert: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
          update: () => Promise.resolve({ data: null, error: new Error('Supabase not configured') }),
        }),
      };
    }
  }
  
  return supabaseClient;
}

async function loadSupabaseFromCDN() {
  return new Promise((resolve, reject) => {
    if (window.supabase) {
      resolve(window.supabase);
      return;
    }
    
    const script = document.createElement('script');
    // Use latest version from CDN
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@latest/dist/umd/supabase.min.js';
    script.onload = () => resolve(window.supabase);
    script.onerror = reject;
    document.head.appendChild(script);
  });
} 