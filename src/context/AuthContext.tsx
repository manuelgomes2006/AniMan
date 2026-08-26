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
  const [loading, setLoading] = useState(true);

  const clearLocalUserData = useCallback(() => {
    try {
      localStorage.removeItem('aniworld_active_session');
      localStorage.removeItem('aniworld_registered_accounts');
      localStorage.removeItem('aniworld_watch_history');
      localStorage.removeItem('aniworld_watchlist');
      localStorage.removeItem('aniworld_preferred_audio');
      sessionStorage.clear();
    } catch {}
  }, []);

  // Fetch real User Profile and Preferences from Supabase Database
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

      const cloudAudio = prefData?.preferred_audio === 'dub' ? 'dub' : 'sub';
      // Sync local storage preference with Cloud DB source of truth
      try {
        localStorage.setItem('aniworld_preferred_audio', cloudAudio);
      } catch {}

      const preferences: UserPreferences = {
        preferredAudio: cloudAudio,
        autoplay: prefData?.autoplay ?? true,
        autoplayNext: prefData?.autoplay_next ?? true,
        skipIntro: prefData?.skip_intro ?? false,
        skipOutro: prefData?.skip_outro ?? false,
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

    // 1. Initial Session Check from Supabase Auth
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!isSubscribed) return;
      setSession(session);

      if (session?.user) {
        setUser(session.user);
        await loadProfile(session.user);
      } else {
        clearLocalUserData();
        setUser(null);
        setProfile(null);
      }
      if (isSubscribed) {
        setLoading(false);
      }
    }).catch((err) => {
      console.error('[AuthContext] Initial Session Check Failed:', err);
      if (isSubscribed) {
        clearLocalUserData();
        setUser(null);
        setProfile(null);
        setLoading(false);
      }
    });

    // 2. Real-Time Supabase Auth State Change Listener (Handles multi-device invalidation)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!isSubscribed) return;
      setSession(session);

      if (event === 'SIGNED_OUT' || !session?.user) {
        clearLocalUserData();
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      if (session?.user) {
        setUser(session.user);
        await loadProfile(session.user);
      }
      setLoading(false);
    });

    return () => {
      isSubscribed = false;
      subscription.unsubscribe();
    };
  }, [clearLocalUserData, loadProfile]);

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
          () => {
            fetchWatchHistoryFromSupabase();
            window.dispatchEvent(new CustomEvent('aniworld_history_updated'));
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'watchlist', filter: `user_id=eq.${user.id}` },
          () => {
            fetchWatchlistFromSupabase();
            window.dispatchEvent(new CustomEvent('aniworld_watchlist_updated'));
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
    setLoading(true);
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
      setLoading(false);
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
      loading,
      signInWithGoogle,
      signOut,
      refreshProfile,
      deleteAccount
    }),
    [user, session, profile, loading, signInWithGoogle, signOut, refreshProfile, deleteAccount]
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
