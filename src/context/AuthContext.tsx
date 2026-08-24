import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/auth/supabaseClient';

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

  // Local fallback session generator
  const getLocalProfile = (email = 'manuel@aniworld.io', name = 'Manuel'): UserProfileData => ({
    id: 'usr_local_01',
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

  const setGuestSession = (email = 'manuel@aniworld.io', username = 'Manuel') => {
    const prof = getLocalProfile(email, username);
    localStorage.setItem(LOCAL_SESSION_KEY, JSON.stringify(prof));
    setProfile(prof);
    setUser({ id: prof.id, email: prof.email, app_metadata: {}, user_metadata: {}, aud: '', created_at: '' } as any);
  };

  // Clear all local storage caches
  const clearAllUserData = () => {
    localStorage.removeItem(LOCAL_SESSION_KEY);
    localStorage.removeItem('aniworld_watch_history');
    localStorage.removeItem('aniworld_watchlist');
    localStorage.removeItem('aniverse_watch_history');
    localStorage.removeItem('aniverse_watchlist');
  };

  // Fetch or initialize profile from Supabase
  const loadProfile = async (currentUser: User) => {
    try {
      if (!isSupabaseConfigured()) {
        const local = localStorage.getItem(LOCAL_SESSION_KEY);
        setProfile(local ? JSON.parse(local) : getLocalProfile(currentUser.email || undefined));
        return;
      }

      const [{ data: profileData }, { data: prefData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', currentUser.id).single().catch(() => ({ data: null })),
        supabase.from('user_preferences').select('*').eq('user_id', currentUser.id).single().catch(() => ({ data: null }))
      ]);

      const email = currentUser.email || 'user@aniworld.io';
      const username = profileData?.username || email.split('@')[0] || 'User';
      const displayName = profileData?.display_name || username;
      const avatarUrl = profileData?.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80';

      const preferences: UserPreferences = {
        preferredAudio: (prefData?.preferred_audio === 'dub' ? 'dub' : 'sub'),
        preferredQuality: prefData?.preferred_quality || 'auto',
        autoplay: prefData?.autoplay ?? true,
        autoplayNext: prefData?.autoplay_next ?? true,
        skipIntro: prefData?.skip_intro ?? false,
        skipOutro: prefData?.skip_outro ?? false,
      };

      setProfile({
        id: currentUser.id,
        username,
        displayName,
        avatarUrl,
        email,
        preferences
      });
    } catch (err) {
      setProfile(getLocalProfile(currentUser.email || undefined));
    }
  };

  useEffect(() => {
    let isSubscribed = true;

    // Safety timeout to prevent screen lock if Supabase network hangs
    const safetyTimeout = setTimeout(() => {
      if (isSubscribed && loading) {
        const local = localStorage.getItem(LOCAL_SESSION_KEY);
        if (local) {
          try {
            const prof = JSON.parse(local);
            setProfile(prof);
            setUser({ id: prof.id, email: prof.email } as any);
          } catch {}
        } else {
          setGuestSession();
        }
        setLoading(false);
      }
    }, 1200);

    if (!isSupabaseConfigured()) {
      const local = localStorage.getItem(LOCAL_SESSION_KEY);
      if (local) {
        try {
          const prof = JSON.parse(local);
          setProfile(prof);
          setUser({ id: prof.id, email: prof.email } as any);
        } catch {}
      } else {
        setGuestSession();
      }
      setLoading(false);
      clearTimeout(safetyTimeout);
      return;
    }

    // Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!isSubscribed) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user).finally(() => {
          if (isSubscribed) setLoading(false);
        });
      } else {
        const local = localStorage.getItem(LOCAL_SESSION_KEY);
        if (local) {
          try {
            const prof = JSON.parse(local);
            setProfile(prof);
            setUser({ id: prof.id, email: prof.email } as any);
          } catch {}
        }
        setLoading(false);
      }
    }).catch(() => {
      const local = localStorage.getItem(LOCAL_SESSION_KEY);
      if (local) {
        try {
          const prof = JSON.parse(local);
          setProfile(prof);
          setUser({ id: prof.id, email: prof.email } as any);
        } catch {}
      } else {
        setGuestSession();
      }
      if (isSubscribed) setLoading(false);
    });

    // Listen to Auth State Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (!isSubscribed) return;
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await loadProfile(session.user);
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      isSubscribed = false;
      clearTimeout(safetyTimeout);
      subscription.unsubscribe();
    };
  }, []);

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

  // Permanent account deletion (purges auth.users and all cascading user tables)
  const deleteAccount = async () => {
    if (user && isSupabaseConfigured()) {
      try {
        // Invoke delete_user_account RPC function to delete from auth.users
        await supabase.rpc('delete_user_account').catch(async () => {
          // Fallback: manually delete from all public user tables
          await Promise.allSettled([
            supabase.from('profiles').delete().eq('id', user.id),
            supabase.from('user_preferences').delete().eq('user_id', user.id),
            supabase.from('watchlist').delete().eq('user_id', user.id),
            supabase.from('watch_history').delete().eq('user_id', user.id),
            supabase.from('favorites').delete().eq('user_id', user.id),
            supabase.from('search_history').delete().eq('user_id', user.id)
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
