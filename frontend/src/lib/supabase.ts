// Modern Supabase client setup using @supabase/ssr
import { createClient as createBrowserClient } from '@/utils/supabase/client';
import { createClient as createServerClient } from '@/utils/supabase/server';

// For backward compatibility with existing code
export async function getSupabase() {
  // Check if we're on the server or client
  if (typeof window === 'undefined') {
    // Server-side: use server client
    return createServerClient();
  } else {
    // Client-side: use browser client
    return createBrowserClient();
  }
} 