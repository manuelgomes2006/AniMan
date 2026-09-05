-- ====================================================================
-- AniMan: Permanent Account Deletion & Security Migration Script
-- Run this script in your Supabase Dashboard -> SQL Editor
-- Direct Link: https://supabase.com/dashboard/project/gxcflibgvgvnwhngxygl/sql/new
-- ====================================================================

-- 1. Ensure authenticated users can delete their own profile row
DROP POLICY IF EXISTS "Users can delete their own profile" ON public.profiles;
CREATE POLICY "Users can delete their own profile"
ON public.profiles FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- 2. Create the transactional, secure self-account deletion RPC function
-- SECURITY DEFINER ensures the function executes with superuser/owner privileges,
-- granting it authority to permanently remove the user from auth.users.
CREATE OR REPLACE FUNCTION public.delete_user_account()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  target_uid UUID;
BEGIN
  -- Obtain authenticated user ID directly from PostgreSQL JWT context
  target_uid := auth.uid();

  IF target_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated: No active user session found.';
  END IF;

  -- 1. Safely remove application records across tables (failsafe against missing tables)
  BEGIN
    DELETE FROM public.watch_history WHERE user_id = target_uid;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    DELETE FROM public.watchlist WHERE user_id = target_uid;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    DELETE FROM public.favorites WHERE user_id = target_uid;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    DELETE FROM public.user_preferences WHERE user_id = target_uid;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    DELETE FROM public.search_history WHERE user_id = target_uid;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    DELETE FROM public.profiles WHERE id = target_uid;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- 2. Permanently delete auth user account identity
  -- This automatically cascades to auth.sessions, auth.identities, and auth.refresh_tokens
  DELETE FROM auth.users WHERE id = target_uid;

  RETURN json_build_object('success', true, 'deleted_user_id', target_uid);
END;
$$;

-- 3. Grant execute permissions on the function to authenticated and anon roles
-- (Granting to anon ensures PostgREST exposes the function in schema cache,
-- while the function itself strictly enforces IF target_uid IS NULL THEN RAISE EXCEPTION)
GRANT EXECUTE ON FUNCTION public.delete_user_account() TO authenticated, anon;

-- 4. Notify PostgREST to immediately refresh its schema cache
NOTIFY pgrst, 'reload schema';
