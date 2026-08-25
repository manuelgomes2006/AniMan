import { supabase, isSupabaseConfigured } from './supabaseClient';

export interface AuthDiagnosticResult {
  configValid: boolean;
  connected: boolean;
  sessionActive: boolean;
  userId?: string;
  userEmail?: string;
  profileExists?: boolean;
  errors: string[];
}

/**
 * Development Auth Diagnostic Utility:
 * Verifies Supabase configuration, connection status, current auth session, profiles table access, and RLS policies.
 */
export async function runAuthDiagnostic(): Promise<AuthDiagnosticResult> {
  const errors: string[] = [];
  const configValid = isSupabaseConfigured();

  if (!configValid) {
    errors.push('SUPABASE_CONFIG_MISSING: VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY is unconfigured or invalid JWT.');
    return {
      configValid: false,
      connected: false,
      sessionActive: false,
      errors,
    };
  }

  let connected = false;
  let sessionActive = false;
  let userId: string | undefined;
  let userEmail: string | undefined;
  let profileExists = false;

  try {
    const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();

    if (sessionErr) {
      errors.push(`AUTH_SESSION_ERROR: ${sessionErr.message}`);
    } else {
      connected = true;
      if (sessionData?.session?.user) {
        sessionActive = true;
        userId = sessionData.session.user.id;
        userEmail = sessionData.session.user.email;

        // Verify profiles table query under RLS
        const { data: profile, error: profileErr } = await supabase
          .from('profiles')
          .select('id, username')
          .eq('id', userId)
          .single();

        if (profileErr) {
          if (profileErr.code === 'PGRST116') {
            errors.push('PROFILE_NOT_FOUND: Trigger may be missing on auth.users.');
          } else {
            errors.push(`PROFILE_ACCESS_DENIED: RLS or SQL Error - ${profileErr.message}`);
          }
        } else if (profile) {
          profileExists = true;
        }
      }
    }
  } catch (err: any) {
    errors.push(`DATABASE_CONNECTION_FAILED: ${err?.message || 'Network error'}`);
  }

  return {
    configValid,
    connected,
    sessionActive,
    userId,
    userEmail,
    profileExists,
    errors,
  };
}
