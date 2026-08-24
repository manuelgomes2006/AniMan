import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export function isSupabaseConfigured(): boolean {
  return Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    !SUPABASE_URL.includes('xyzcompany') &&
    !SUPABASE_ANON_KEY.includes('dummykey')
  );
}

// Create client with fallback URL to prevent instant initialization crash
const fallbackUrl = isSupabaseConfigured() ? SUPABASE_URL : 'https://demo-project.supabase.co';
const fallbackKey = isSupabaseConfigured() ? SUPABASE_ANON_KEY : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.demo';

export const supabase = createClient(fallbackUrl, fallbackKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true
  }
});
