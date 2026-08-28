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
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  deleteAccount: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  const clearLocalUserData = useCallback(() => {
    try {
      localStorage.removeItem('aniworld_active_session');
      localStorage.removeItem('aniworld_registered_accounts');
      localStorage.removeItem('aniworld_watch_history');
      localStorage.removeItem('aniworld_watchlist');
      sessionStorage.clear();
    } catch {}
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

      const username = profileData?.username || currentUser.user_metadata?.username || email.split('@')[0] || 'User';
      const displayName = profileData?.display_name || currentUser.user_metadata?.display_name || username;
      
      // Avatar Cache Busting by updated_at timestamp
      let rawAvatar = profileData?.avatar_url || currentUser.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80';
      const updatedAtTS = profileData?.updated_at ? new Date(profileData.updated_at).getTime() : Date.now();
      if (rawAvatar.startsWith('http') && !rawAvatar.includes('?v=')) {
        rawAvatar = `${rawAvatar}?v=${updatedAtTS}`;
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
      applySession(nextSession);
      setAuthLoading(false);
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

  const signInWithGoogle = useCallback(async () => {
    if (!isSupabaseConfigured()) return;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`
      }
    });
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

  const deleteAccount = useCallback(async (): Promise<boolean> => {
    if (!user || !isSupabaseConfigured()) {
      throw new Error('No authenticated user session found');
    }

    const { error: rpcError } = await supabase.rpc('delete_user_account');

    if (rpcError) {
      console.error('[ACCOUNT DELETION FAILED]', rpcError);
      throw new Error(rpcError.message || 'Account deletion failed');
    }

    clearLocalUserData();
    await supabase.auth.signOut().catch(() => {});
    setUser(null);
    setSession(null);
    setProfile(null);
    return true;
  }, [user, clearLocalUserData]);

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
