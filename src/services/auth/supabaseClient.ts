import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

/**
 * Validates whether Supabase environment variables are properly populated with valid format.
 * ANON key must be a valid JWT string (ey...).
 */
export function isSupabaseConfigured(): boolean {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return false;
  if (!SUPABASE_URL.startsWith('https://')) return false;
  if (SUPABASE_ANON_KEY.includes('sb_publishable_') || SUPABASE_ANON_KEY.includes('dummy')) return false;
  return SUPABASE_ANON_KEY.startsWith('eyJ');
}

export const supabase = createClient(
  SUPABASE_URL || 'https://placeholder.supabase.co',
  SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
