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
      }
    };
  }

  if (!supabaseClient) {
    // Load Supabase from CDN (latest version)
    if (!window.supabase) {
      await loadSupabaseFromCDN();
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    supabaseClient = window.supabase.createClient(supabaseUrl, supabaseAnonKey);
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