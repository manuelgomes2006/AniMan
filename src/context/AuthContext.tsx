import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/auth/supabaseClient';
import { fetchWatchHistoryFromSupabase, fetchWatchlistFromSupabase } from '../services/userStore';

export interface UserPreferences {
  preferredAudio: 'sub' | 'dub';
  autoplay: boolean;
  autoplayNext: boolean;
  skipIntro: boolean;
  skipOutro: boolean;
  updatedAt?: string;
}

export interface UserProfileData {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  email: string;
  preferences: UserPreferences;
  updatedAt?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfileData | null;
  loading: boolean;
  authLoading: boolean;
  signInWithGoogle: (customRedirect?: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  deleteAccount: (forceLocalPurge?: boolean) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const clearLocalUserData = useCallback(() => {
    try {
      // Clear all AniWorld / AniStream storage keys and Supabase session tokens
      Object.keys(localStorage).forEach(key => {
        if (
          key.startsWith('aniworld_') || 
          key.startsWith('anistream_') || 
          key.startsWith('sb-') ||
          key.includes('supabase.auth')
        ) {
          localStorage.removeItem(key);
        }
      });
      sessionStorage.clear();
    } catch (e) {
      console.warn('Clear local user data notice:', e);
    }
  }, []);

  // Fetch real User Profile and Preferences from Supabase Database & Auth Metadata
  const loadProfile = useCallback(async (currentUser: User) => {
    if (!currentUser || !currentUser.id || !isSupabaseConfigured()) {
      setProfile(null);
      return;
    }

    try {
      const email = currentUser.email || '';

      const [{ data: profileData, error: profileErr }, { data: prefData, error: prefErr }] = await Promise.all([
        supabase.from('profiles').select('id, username, display_name, avatar_url, updated_at').eq('id', currentUser.id).maybeSingle(),
        supabase.from('user_preferences').select('user_id, preferred_audio, preferred_provider, autoplay, autoplay_next, skip_intro, skip_outro, updated_at').eq('user_id', currentUser.id).maybeSingle()
      ]);

      if (profileErr) {
        console.error('[AuthContext] Profile fetch error:', profileErr.message);
      }
      if (prefErr) {
        console.error('[AuthContext] Preferences fetch error:', prefErr.message);
      }

      const username = profileData?.username || currentUser.user_metadata?.username || currentUser.user_metadata?.full_name || email.split('@')[0] || 'User';
      const displayName = profileData?.display_name || currentUser.user_metadata?.display_name || currentUser.user_metadata?.full_name || currentUser.user_metadata?.name || username;
      
      // Avatar Cache Busting by updated_at timestamp (supports Supabase storage, Google OAuth picture, etc.)
      let rawAvatar = profileData?.avatar_url || currentUser.user_metadata?.avatar_url || currentUser.user_metadata?.picture || currentUser.user_metadata?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80';
      const updatedAtTS = profileData?.updated_at ? new Date(profileData.updated_at).getTime() : Date.now();
      if (rawAvatar.startsWith('http') && !rawAvatar.includes('?v=')) {
        rawAvatar = `${rawAvatar}?v=${updatedAtTS}`;
      }

      // Auto-populate profile in database if new user (e.g. fresh Google OAuth sign-in)
      if (!profileData && currentUser.id) {
        supabase.from('profiles').upsert({
          id: currentUser.id,
          email: email.toLowerCase(),
          username,
          display_name: displayName,
          avatar_url: rawAvatar,
          updated_at: new Date().toISOString()
        }).then(() => {}).catch(() => {});
      }

      // Multi-layer Fail-Safe Preferred Audio resolution (DB -> User Metadata -> Local Storage)
      const rawAudioPref = (
        prefData?.preferred_audio ||
        currentUser.user_metadata?.preferred_audio ||
        localStorage.getItem('aniworld_preferred_audio') ||
        'sub'
      ).toString().toLowerCase().trim();

      const preferredAudio: 'sub' | 'dub' = rawAudioPref === 'dub' ? 'dub' : 'sub';

      // Keep local player storage in 100% sync
      localStorage.setItem('aniworld_preferred_audio', preferredAudio);

      const preferences: UserPreferences = {
        preferredAudio,
        autoplay: prefData?.autoplay ?? currentUser.user_metadata?.autoplay ?? true,
        autoplayNext: prefData?.autoplay_next ?? currentUser.user_metadata?.autoplay_next ?? true,
        skipIntro: prefData?.skip_intro ?? currentUser.user_metadata?.skip_intro ?? false,
        skipOutro: prefData?.skip_outro ?? currentUser.user_metadata?.skip_outro ?? false,
        updatedAt: prefData?.updated_at || undefined,
      };

      const loadedProfile: UserProfileData = {
        id: currentUser.id,
        username,
        displayName,
        avatarUrl: rawAvatar,
        email,
        preferences,
        updatedAt: profileData?.updated_at || undefined,
      };

      setProfile(loadedProfile);
    } catch (err) {
      console.error('[AuthContext] Load Profile Exception:', err);
    }
  }, []);

  useEffect(() => {
    let isSubscribed = true;

    const applySession = (nextSession: Session | null) => {
      if (!isSubscribed) return;

      setSession(nextSession);

      if (nextSession?.user) {
        setUser(nextSession.user);
        void loadProfile(nextSession.user).catch((error) =>
          console.error('[AuthContext] Profile load notice:', error)
        );
      } else {
        setUser(null);
        setProfile(null);
      }
    };

    // Subscribe first so a sign-in, sign-out, or token refresh cannot be missed
    // while the stored session is being restored during application startup.
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (!isSubscribed) return;

      console.log(`[AuthContext] Auth State Event: ${event}`, nextSession?.user?.email || 'No User');

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setUser(null);
        setProfile(null);
        setAuthLoading(false);
      } else if (nextSession?.user) {
        setSession(nextSession);
        setUser(nextSession.user);
        void loadProfile(nextSession.user).catch((error) =>
          console.error('[AuthContext] Profile load notice:', error)
        );
        setAuthLoading(false);
      } else if (event !== 'INITIAL_SESSION') {
        setSession(null);
        setUser(null);
        setProfile(null);
        setAuthLoading(false);
      }
    });

    async function initAuth() {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        applySession(session);
      } catch (err) {
        console.error('[AuthContext] Session init error:', err);
      } finally {
        if (isSubscribed) {
          setAuthLoading(false);
        }
      }
    }

    initAuth();

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  // 3. Real-Time Multi-Device Database Sync Subscription
  useEffect(() => {
    if (!user?.id || !isSupabaseConfigured()) return;

    let channel: any = null;
    try {
      channel = supabase
        .channel(`realtime-user-sync-${user.id}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
          () => {
            loadProfile(user);
            window.dispatchEvent(new CustomEvent('aniworld_profile_updated'));
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'user_preferences', filter: `user_id=eq.${user.id}` },
          () => {
            loadProfile(user);
            window.dispatchEvent(new CustomEvent('aniworld_profile_updated'));
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'watch_history', filter: `user_id=eq.${user.id}` },
          async (payload) => {
            console.log('[Supabase Realtime] Multi-device watch progress updated:', payload);
            const freshHistory = await fetchWatchHistoryFromSupabase();
            window.dispatchEvent(new CustomEvent('aniworld_history_updated', { detail: freshHistory }));
          }
        )
        .on(
          'broadcast',
          { event: 'watch_history_signal' },
          async (payload) => {
            console.log('[Supabase Broadcast] Instant cross-device watch signal received:', payload);
            const freshHistory = await fetchWatchHistoryFromSupabase();
            window.dispatchEvent(new CustomEvent('aniworld_history_updated', { detail: freshHistory }));
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'watchlist', filter: `user_id=eq.${user.id}` },
          async (payload) => {
            console.log('[Supabase Realtime] Multi-device watchlist updated:', payload);
            const freshWatchlist = await fetchWatchlistFromSupabase();
            window.dispatchEvent(new CustomEvent('aniworld_watchlist_updated', { detail: freshWatchlist }));
          }
        )
        .on(
          'broadcast',
          { event: 'watchlist_signal' },
          async (payload) => {
            console.log('[Supabase Broadcast] Instant cross-device watchlist signal received:', payload);
            const freshWatchlist = await fetchWatchlistFromSupabase();
            window.dispatchEvent(new CustomEvent('aniworld_watchlist_updated', { detail: freshWatchlist }));
          }
        )
        .subscribe();
    } catch (err) {
      console.warn('Realtime subscription notice:', err);
    }

    return () => {
      if (channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [user, loadProfile]);

  const signInWithGoogle = useCallback(async (customRedirect?: string) => {
    if (!isSupabaseConfigured()) {
      throw new Error('Supabase is not configured. Please check your .env file.');
    }

    const redirectTarget = customRedirect?.startsWith('/')
      ? `${window.location.origin}${customRedirect}`
      : (customRedirect || `${window.location.origin}/`);

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectTarget,
        skipBrowserRedirect: true
      }
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data?.url) {
      // Validate whether the Google provider is enabled in Supabase before navigating away
      try {
        const check = await fetch(data.url, { redirect: 'manual' });
        if (check.status === 400) {
          const body = await check.json();
          if (body?.msg?.includes('not enabled') || body?.error_code === 'validation_failed') {
            throw new Error(
              'GOOGLE_PROVIDER_DISABLED: Google Sign-In is not enabled in your Supabase project yet. Please enable Google in your Supabase Dashboard under Authentication -> Providers.'
            );
          }
        }
      } catch (err: any) {
        if (err.message?.includes('GOOGLE_PROVIDER_DISABLED')) {
          throw err;
        }
        // If CORS blocks the manual redirect fetch, that's expected for external redirects; proceed
      }

      window.location.href = data.url;
    }
  }, []);

  const signOut = useCallback(async () => {
    setAuthLoading(true);
    try {
      if (isSupabaseConfigured()) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.error('[AUTH SIGNOUT EXCEPTION]', err);
    } finally {
      clearLocalUserData();
      setUser(null);
      setSession(null);
      setProfile(null);
      setAuthLoading(false);
    }
  }, [clearLocalUserData]);

  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadProfile(user);
    }
  }, [user, loadProfile]);

  const deleteAccount = useCallback(async (forceLocalPurge: boolean = false): Promise<boolean> => {
    if (!user || !isSupabaseConfigured()) {
      throw new Error('No authenticated user session found');
    }

    const userId = user.id;
    const token = session?.access_token;
    let deletedInSupabase = false;

    // Method 1: Database RPC function delete_user_account() in Supabase PostgreSQL
    try {
      const { data: rpcData, error: rpcError } = await supabase.rpc('delete_user_account');
      if (!rpcError) {
        deletedInSupabase = true;
        console.log('[AuthContext] Account permanently deleted via Supabase RPC:', rpcData);
      } else {
        console.warn('[AuthContext] Supabase RPC delete_user_account notice:', rpcError.message);
      }
    } catch (rpcEx: any) {
      console.warn('[AuthContext] Supabase RPC exception:', rpcEx.message);
    }

    // Method 2: Server-side admin deletion API (/api/delete-account using SUPABASE_SERVICE_ROLE_KEY)
    if (!deletedInSupabase) {
      try {
        const resp = await fetch('/api/delete-account', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, token })
        });
        const resData = await resp.json().catch(() => ({}));
        if (resp.ok && resData.success) {
          deletedInSupabase = true;
          console.log('[AuthContext] Account permanently deleted via Supabase Admin API');
        } else {
          console.warn('[AuthContext] /api/delete-account notice:', resData.error || resData.message);
        }
      } catch (apiErr: any) {
        console.warn('[AuthContext] /api/delete-account exception:', apiErr.message);
      }
    }

    // If neither Supabase RPC nor Admin Service Role deletion succeeded and forceLocalPurge is false,
    // raise an explicit error to prevent giving a false confirmation
    if (!deletedInSupabase && !forceLocalPurge) {
      throw new Error('SUPABASE_DELETION_NOT_CONFIGURED');
    }

    // Wipe all user application tables
    try {
      await Promise.allSettled([
        supabase.from('watch_history').delete().eq('user_id', userId),
        supabase.from('watchlist').delete().eq('user_id', userId),
        supabase.from('favorites').delete().eq('user_id', userId),
        supabase.from('user_preferences').delete().eq('user_id', userId),
        supabase.from('search_history').delete().eq('user_id', userId),
        supabase.from('profiles').delete().eq('id', userId),
      ]);
    } catch (cleanupErr) {
      console.warn('[SUPABASE DATA PURGE NOTICE]', cleanupErr);
    }

    // Clear all local browser storage, sessions, and cached tokens
    clearLocalUserData();

    // Terminate active Supabase Auth session
    try {
      await supabase.auth.signOut();
    } catch (signOutErr) {
      console.warn('[AUTH SIGNOUT NOTICE]', signOutErr);
    }

    // Reset user and profile states
    setUser(null);
    setSession(null);
    setProfile(null);
    setAuthLoading(false);

    return true;
  }, [user, session, clearLocalUserData]);

  // Memoize Context Provider value to prevent unnecessary re-renders
  const contextValue = useMemo(
    () => ({
      user,
      session,
      profile,
      loading: authLoading,
      authLoading,
      signInWithGoogle,
      signOut,
      refreshProfile,
      deleteAccount
    }),
    [user, session, profile, authLoading, signInWithGoogle, signOut, refreshProfile, deleteAccount]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
