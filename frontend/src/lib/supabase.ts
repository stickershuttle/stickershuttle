// Modern Supabase client setup for Pages Router
import { createClient as createBrowserClient } from '@/utils/supabase/client';

// For Pages Router, we only use the browser client
// Server-side rendering in Pages Router doesn't support next/headers
export async function getSupabase() {
  return createBrowserClient();
} 