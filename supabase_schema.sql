-- ====================================================================
-- AniWorld Supabase Database & Security Migration Script
-- Run this in your Supabase SQL Editor to set up tables, RLS & triggers
-- ====================================================================

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE,
  display_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. WATCHLIST TABLE
CREATE TABLE IF NOT EXISTS public.watchlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anime_id INTEGER NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('watching', 'completed', 'plan_to_watch', 'on_hold', 'dropped')),
  added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, anime_id)
);

-- 3. WATCH HISTORY TABLE (Double-quoted "current_time" to avoid PostgreSQL keyword collision)
CREATE TABLE IF NOT EXISTS public.watch_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anime_id INTEGER NOT NULL,
  episode_number INTEGER NOT NULL,
  "current_time" NUMERIC DEFAULT 0,
  duration NUMERIC DEFAULT 0,
  completed BOOLEAN DEFAULT FALSE,
  last_watched TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, anime_id, episode_number)
);

-- 4. FAVORITES TABLE
CREATE TABLE IF NOT EXISTS public.favorites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  anime_id INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, anime_id)
);

-- 5. USER PREFERENCES TABLE
CREATE TABLE IF NOT EXISTS public.user_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  preferred_audio TEXT DEFAULT 'sub' CHECK (preferred_audio IN ('sub', 'dub')),
  preferred_quality TEXT DEFAULT 'auto',
  autoplay BOOLEAN DEFAULT TRUE,
  autoplay_next BOOLEAN DEFAULT TRUE,
  skip_intro BOOLEAN DEFAULT FALSE,
  skip_outro BOOLEAN DEFAULT FALSE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. SEARCH HISTORY TABLE
CREATE TABLE IF NOT EXISTS public.search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  search_query TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- INDEXES FOR MAXIMUM QUERY PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_watchlist_user_id ON public.watchlist(user_id);
CREATE INDEX IF NOT EXISTS idx_watchlist_user_anime ON public.watchlist(user_id, anime_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_user_id ON public.watch_history(user_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_user_anime ON public.watch_history(user_id, anime_id);
CREATE INDEX IF NOT EXISTS idx_watch_history_last_watched ON public.watch_history(user_id, last_watched DESC);
CREATE INDEX IF NOT EXISTS idx_favorites_user_id ON public.favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON public.search_history(user_id, created_at DESC);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watchlist ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.search_history ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can read public profiles" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can delete own profile" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- Watchlist Policies
CREATE POLICY "Users can manage own watchlist" ON public.watchlist FOR ALL USING (auth.uid() = user_id);

-- Watch History Policies
CREATE POLICY "Users can manage own watch history" ON public.watch_history FOR ALL USING (auth.uid() = user_id);

-- Favorites Policies
CREATE POLICY "Users can manage own favorites" ON public.favorites FOR ALL USING (auth.uid() = user_id);

-- Preferences Policies
CREATE POLICY "Users can manage own preferences" ON public.user_preferences FOR ALL USING (auth.uid() = user_id);

-- Search History Policies
CREATE POLICY "Users can manage own search history" ON public.search_history FOR ALL USING (auth.uid() = user_id);

-- ====================================================================
-- AUTOMATIC NEW USER INITIALIZATION TRIGGER
-- ====================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, display_name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80')
  ) ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_preferences (user_id, preferred_audio, preferred_quality, autoplay, autoplay_next, skip_intro, skip_outro)
  VALUES (NEW.id, 'sub', 'auto', true, true, false, false)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- 🛑 SECURE SELF ACCOUNT DELETION RPC FUNCTION
-- ====================================================================

CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS void AS $$
BEGIN
  -- Permanently delete the authenticated user from auth.users
  -- ON DELETE CASCADE automatically purges profiles, watchlist, history, favorites, preferences, search_history
  DELETE FROM auth.users WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execution to authenticated users
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated;

-- ====================================================================
-- 🧹 AUTOMATIC 6-MONTH INACTIVE USER ACCOUNT DELETION PROCEDURE
-- ====================================================================

CREATE OR REPLACE FUNCTION public.delete_inactive_users_6_months()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER := 0;
BEGIN
  WITH inactive_users AS (
    SELECT id FROM auth.users
    WHERE COALESCE(last_sign_in_at, created_at) < (NOW() - INTERVAL '6 months')
  )
  DELETE FROM auth.users
  WHERE id IN (SELECT id FROM inactive_users);

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
