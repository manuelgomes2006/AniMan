/**
 * Note: Authentication is handled strictly via Supabase Auth (auth.users and session persistence).
 * Fake/localStorage authentication has been removed as per security specifications.
 */

export function clearLocalAuthCache(): void {
  try {
    localStorage.removeItem('aniworld_active_session');
    localStorage.removeItem('aniworld_registered_accounts');
  } catch {}
}
