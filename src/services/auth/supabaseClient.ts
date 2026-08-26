import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  'https://gxcflibgvgvnwhngxygl.supabase.co';

const supabaseKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_bMPUv__U73SLnCBgs6Ab9g_VgXiJZZ2';

if (!supabaseUrl || !supabaseKey) {
  console.error('[Supabase Client Error] Supabase environment variables are missing');
}

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseKey && supabaseUrl.startsWith('https://'));
}

export const supabase = createClient(
  supabaseUrl,
  supabaseKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);
