import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/auth/supabaseClient';
import { fetchWatchHistoryFromSupabase, fetchWatchlistFromSupabase } from '../services/userStore';

export interface UserPreferences {
  preferredAudio: 'sub' | 'dub';
  preferredLanguage: string;
  preferredQuality: string;
  autoplay: boolean;
  autoplayNext: boolean;
  autoPause: boolean;
  skipIntro: boolean;
  skipOutro: boolean;
}

export interface UserProfileData {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string;
  email: string;
  preferences: UserPreferences;
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

  const clearLocalUserData = () => {
    try {
      localStorage.removeItem('aniworld_active_session');
      localStorage.removeItem('aniworld_registered_accounts');
      localStorage.removeItem('aniworld_watch_history');
      localStorage.removeItem('aniworld_watchlist');
      localStorage.removeItem('aniworld_preferred_audio');
      sessionStorage.clear();
    } catch {}
  };

  // Fetch real User Profile and Preferences from Supabase Database
  const loadProfile = async (currentUser: User) => {
    if (!currentUser || !currentUser.id || !isSupabaseConfigured()) {
      setProfile(null);
      return;
    }

    try {
      const email = currentUser.email || '';

      const [{ data: profileData, error: profileErr }, { data: prefData, error: prefErr }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', currentUser.id).maybeSingle(),
        supabase.from('user_preferences').select('*').eq('user_id', currentUser.id).maybeSingle()
      ]);

      if (profileErr) {
        console.error('[AuthContext] Profile fetch error:', profileErr.message);
      }
      if (prefErr) {
        console.error('[AuthContext] Preferences fetch error:', prefErr.message);
      }

      const username = profileData?.username || currentUser.user_metadata?.username || email.split('@')[0] || 'User';
      const displayName = profileData?.display_name || currentUser.user_metadata?.display_name || username;
      let avatarUrl = profileData?.avatar_url || currentUser.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80';

      // Append cache buster to avatar URL if updated_at is present
      if (profileData?.updated_at && avatarUrl.startsWith('http')) {
        const v = new Date(profileData.updated_at).getTime();
        avatarUrl = avatarUrl.includes('?') ? `${avatarUrl}&v=${v}` : `${avatarUrl}?v=${v}`;
      }

      // Auto-create missing database rows if absent
      if (!profileData) {
        await supabase.from('profiles').upsert({
          id: currentUser.id,
          email: email.toLowerCase(),
          username: username.toLowerCase(),
          display_name: displayName,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' }).catch(() => {});
      }

      if (!prefData) {
        await supabase.from('user_preferences').upsert({
          user_id: currentUser.id,
          preferred_audio: 'sub',
          preferred_language: 'English',
          preferred_quality: 'auto',
          autoplay: true,
          autoplay_next: true,
          auto_pause: false,
          skip_intro: false,
          skip_outro: false,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' }).catch(() => {});
      }

      const preferences: UserPreferences = {
        preferredAudio: prefData?.preferred_audio === 'dub' ? 'dub' : 'sub',
        preferredLanguage: prefData?.preferred_language || 'English',
        preferredQuality: prefData?.preferred_quality || 'auto',
        autoplay: prefData?.autoplay ?? true,
        autoplayNext: prefData?.autoplay_next ?? true,
        autoPause: prefData?.auto_pause ?? false,
        skipIntro: prefData?.skip_intro ?? false,
        skipOutro: prefData?.skip_outro ?? false,
      };

      const loadedProfile: UserProfileData = {
        id: currentUser.id,
        username,
        displayName,
        avatarUrl,
        email,
        preferences
      };

      setProfile(loadedProfile);
    } catch (err) {
      console.error('[AuthContext] Load Profile Exception:', err);
    }
  };

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
  }, []);

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
            console.log('[Realtime Sync] Profile changed on database');
            loadProfile(user);
            window.dispatchEvent(new CustomEvent('aniworld_profile_updated'));
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'user_preferences', filter: `user_id=eq.${user.id}` },
          () => {
            console.log('[Realtime Sync] Preferences changed on database');
            loadProfile(user);
            window.dispatchEvent(new CustomEvent('aniworld_profile_updated'));
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'watch_history', filter: `user_id=eq.${user.id}` },
          () => {
            console.log('[Realtime Sync] Watch history changed on database');
            fetchWatchHistoryFromSupabase();
            window.dispatchEvent(new CustomEvent('aniworld_history_updated'));
          }
        )
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'watchlist', filter: `user_id=eq.${user.id}` },
          () => {
            console.log('[Realtime Sync] Watchlist changed on database');
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
  }, [user?.id]);

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured()) return;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`
      }
    });
  };

  const signOut = async () => {
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
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user);
    }
  };

  const deleteAccount = async (): Promise<boolean> => {
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
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        signInWithGoogle,
        signOut,
        refreshProfile,
        deleteAccount
      }}
    >
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
