import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/auth/supabaseClient';
import { fetchWatchHistoryFromSupabase, fetchWatchlistFromSupabase } from '../services/userStore';

export interface UserPreferences {
  preferredAudio: 'sub' | 'dub';
  preferredQuality: string;
  autoplay: boolean;
  autoplayNext: boolean;
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
  deleteAccount: () => Promise<void>;
  setGuestSession: (email?: string, username?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);
const LOCAL_SESSION_KEY = 'aniworld_active_session';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Local Guest / Active Session Generator & Persistence Helper
  const getGuestProfile = (email = 'user@aniworld.io', name = 'Member'): UserProfileData => ({
    id: `usr_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
    username: name,
    displayName: name,
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
    email,
    preferences: {
      preferredAudio: 'sub',
      preferredQuality: 'auto',
      autoplay: true,
      autoplayNext: true,
      skipIntro: false,
      skipOutro: false,
    }
  });

  const setGuestSession = (email = 'user@aniworld.io', username = 'Member') => {
    const prof = getGuestProfile(email, username);
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(prof));
    setProfile(prof);
    setUser({ id: prof.id, email: prof.email, app_metadata: {}, user_metadata: {}, aud: '', created_at: '' } as any);
  };

  const clearAllUserData = () => {
    localStorage.removeItem(LOCAL_SESSION_KEY);
    localStorage.removeItem('aniworld_watch_history');
    localStorage.removeItem('aniworld_watchlist');
  };

  const restoreLocalSessionIfPresent = () => {
    const local = localStorage.getItem(LOCAL_SESSION_KEY);
    if (local) {
      try {
        const prof = JSON.parse(local);
        setProfile(prof);
        setUser({ id: prof.id, email: prof.email } as any);
        return true;
      } catch {}
    }
    return false;
  };

  // Load User Profile and Preferences from Supabase Database
  const loadProfile = async (currentUser: User) => {
    try {
      if (!isSupabaseConfigured()) {
        if (!restoreLocalSessionIfPresent()) {
          setProfile(getGuestProfile(currentUser.email || undefined));
        }
        return;
      }

      // Use maybeSingle() to gracefully return null if record is missing without throwing errors
      const [{ data: profileData }, { data: prefData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', currentUser.id).maybeSingle(),
        supabase.from('user_preferences').select('*').eq('user_id', currentUser.id).maybeSingle()
      ]);

      const email = currentUser.email || 'user@aniworld.io';
      const username = profileData?.username || currentUser.user_metadata?.username || email.split('@')[0] || 'User';
      const displayName = profileData?.display_name || currentUser.user_metadata?.display_name || username;
      const avatarUrl = profileData?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80';

      const preferences: UserPreferences = {
        preferredAudio: prefData?.preferred_audio === 'dub' ? 'dub' : 'sub',
        preferredQuality: prefData?.preferred_quality || 'auto',
        autoplay: prefData?.autoplay ?? true,
        autoplayNext: prefData?.autoplay_next ?? true,
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
      localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(loadedProfile));
    } catch (err) {
      console.warn('[AuthContext] Load Profile Notice:', err);
      if (!restoreLocalSessionIfPresent()) {
        setProfile(getGuestProfile(currentUser.email || undefined, currentUser.email?.split('@')[0]));
      }
    }
  };

  useEffect(() => {
    let isSubscribed = true;

    // 1. Initial Session Retrieval
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isSubscribed) return;
      setSession(session);
      if (session?.user) {
        setUser(session.user);
        loadProfile(session.user).finally(() => {
          if (isSubscribed) setLoading(false);
        });
      } else {
        restoreLocalSessionIfPresent();
        setLoading(false);
      }
    }).catch(() => {
      if (isSubscribed) {
        restoreLocalSessionIfPresent();
        setLoading(false);
      }
    });

    // 2. Real-Time Auth State Listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isSubscribed) return;
      setSession(session);

      if (session?.user) {
        setUser(session.user);
        await loadProfile(session.user);
      } else {
        const hasLocal = restoreLocalSessionIfPresent();
        if (!hasLocal) {
          setProfile(null);
          setUser(null);
        }
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

    const channel = supabase
      .channel(`multi-device-sync-${user.id}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        () => {
          console.log('[Multi-Device Sync] Profile updated on another device');
          loadProfile(user);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'user_preferences', filter: `user_id=eq.${user.id}` },
        () => {
          console.log('[Multi-Device Sync] Preferences updated on another device');
          loadProfile(user);
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'watch_history', filter: `user_id=eq.${user.id}` },
        () => {
          console.log('[Multi-Device Sync] Watch history updated on another device');
          fetchWatchHistoryFromSupabase();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'watchlist', filter: `user_id=eq.${user.id}` },
        () => {
          console.log('[Multi-Device Sync] Watchlist updated on another device');
          fetchWatchlistFromSupabase();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  const signInWithGoogle = async () => {
    if (!isSupabaseConfigured()) {
      setGuestSession('google_user@aniworld.io', 'Google User');
      return;
    }
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`
      }
    });
  };

  const signOut = async () => {
    clearAllUserData();
    setUser(null);
    setSession(null);
    setProfile(null);
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut().catch(() => {});
    }
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user);
    }
  };

  const deleteAccount = async () => {
    if (user && isSupabaseConfigured()) {
      try {
        await supabase.rpc('delete_user_account').catch(async () => {
          await Promise.allSettled([
            supabase.from('profiles').delete().eq('id', user.id),
            supabase.from('user_preferences').delete().eq('user_id', user.id),
            supabase.from('watchlist').delete().eq('user_id', user.id),
            supabase.from('watch_history').delete().eq('user_id', user.id),
            supabase.from('favorites').delete().eq('user_id', user.id),
          ]);
        });
      } catch (err) {
        console.warn('Account deletion notice:', err);
      }
    }
    await signOut();
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
        deleteAccount,
        setGuestSession
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
