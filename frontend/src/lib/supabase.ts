// Modern Supabase client setup for Pages Router
import { createClient } from '@/utils/supabase/client';

// For Pages Router, we only use the browser client
// Server-side rendering in Pages Router doesn't support next/headers
export function getSupabase() {
  return createClient();
} 