import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '../services/auth/supabaseClient';

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
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch or initialize profile & user preferences from Supabase
  const loadProfile = async (currentUser: User) => {
    try {
      const [{ data: profileData }, { data: prefData }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', currentUser.id).single(),
        supabase.from('user_preferences').select('*').eq('user_id', currentUser.id).single()
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

      const userProfile: UserProfileData = {
        id: currentUser.id,
        username,
        displayName,
        avatarUrl,
        email,
        preferences
      };

      setProfile(userProfile);
    } catch (err) {
      console.warn('Profile load notice:', err);
      setProfile({
        id: currentUser.id,
        username: currentUser.email?.split('@')[0] || 'User',
        displayName: currentUser.email?.split('@')[0] || 'User',
        avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80',
        email: currentUser.email || 'user@aniworld.io',
        preferences: {
          preferredAudio: 'sub',
          preferredQuality: 'auto',
          autoplay: true,
          autoplayNext: true,
          skipIntro: false,
          skipOutro: false
        }
      });
    }
  };

  useEffect(() => {
    // Initial Session Check
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        loadProfile(session.user).finally(() => setLoading(false));
      } else {
        setLoading(false);
      }
    });

    // Listen to Auth State Changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
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
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/`
      }
    });
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
  };

  const refreshProfile = async () => {
    if (user) {
      await loadProfile(user);
    }
  };

  const deleteAccount = async () => {
    if (!user) return;
    try {
      await supabase.from('profiles').delete().eq('id', user.id);
      await supabase.from('user_preferences').delete().eq('user_id', user.id);
      await supabase.from('watchlist').delete().eq('user_id', user.id);
      await supabase.from('watch_history').delete().eq('user_id', user.id);
      await supabase.from('favorites').delete().eq('user_id', user.id);
      await signOut();
    } catch (err) {
      console.error('Account deletion error:', err);
    }
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
