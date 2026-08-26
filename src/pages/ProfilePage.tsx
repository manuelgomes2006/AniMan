import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../services/auth/supabaseClient';
import { getWatchlist, setUserAudioPreference, syncAllUserPreferencesToSupabase } from '../services/userStore';
import { Settings, Check, LogOut, ShieldAlert, Loader2, AlertCircle, Trash2, X, Volume2 } from 'lucide-react';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { profile, signOut, refreshProfile, deleteAccount, loading: authLoading } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [preferredAudio, setPreferredAudio] = useState<'sub' | 'dub'>('sub');
  const [autoplay, setAutoplay] = useState(true);
  const [autoplayNext, setAutoplayNext] = useState(true);
  const [skipIntro, setSkipIntro] = useState(false);
  const [skipOutro, setSkipOutro] = useState(false);

  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Double Confirmation Delete Account Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmInputText, setConfirmInputText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Stats Counters
  const [stats, setStats] = useState({
    watching: 0,
    completed: 0,
    planToWatch: 0,
    favorites: 0
  });

  // Populate form state ONLY when profile ID or updatedAt timestamp changes from DB
  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || profile.username || '');
      setUsername(profile.username || '');
      setAvatarUrl(profile.avatarUrl || '');
      setPreferredAudio(profile.preferences?.preferredAudio || 'sub');
      setAutoplay(profile.preferences?.autoplay ?? true);
      setAutoplayNext(profile.preferences?.autoplayNext ?? true);
      setSkipIntro(profile.preferences?.skipIntro ?? false);
      setSkipOutro(profile.preferences?.skipOutro ?? false);
    }

    const list = getWatchlist();
    setStats({
      watching: list.filter(i => i.category === 'watching').length || 0,
      completed: list.filter(i => i.category === 'completed').length || 0,
      planToWatch: list.filter(i => i.category === 'plan_to_watch').length || 0,
      favorites: list.length || 0
    });
  }, [profile?.id, profile?.updatedAt]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSavedSuccess(false);

    const cleanUsername = username.trim().toLowerCase();
    const cleanDisplayName = displayName.trim() || cleanUsername;
    const cleanAvatarUrl = avatarUrl.trim();

    try {
      if (!profile?.id || !isSupabaseConfigured()) {
        throw new Error('User session not found or database client is unavailable.');
      }

      // 1. Validate Username Uniqueness via Supabase Database if username changed
      if (cleanUsername !== profile.username.toLowerCase()) {
        const { data: existing, error: checkError } = await supabase
          .from('profiles')
          .select('id, username')
          .eq('username', cleanUsername)
          .maybeSingle();

        if (checkError) {
          console.error('[Username Check Notice]', checkError.message);
        } else if (existing && existing.id !== profile.id) {
          setErrorMsg(`Username '@${cleanUsername}' is already taken by another user.`);
          setSaving(false);
          return;
        }
      }

      const updatedAt = new Date().toISOString();

      // 2. Update profiles table in Supabase Cloud DB
      const { error: profileError } = await supabase.from('profiles').upsert({
        id: profile.id,
        username: cleanUsername,
        display_name: cleanDisplayName,
        avatar_url: cleanAvatarUrl,
        updated_at: updatedAt
      }, { onConflict: 'id' });

      if (profileError) {
        console.error('[Supabase Profile Update Error]', profileError);
        throw new Error(profileError.message || 'Failed to update profile in database');
      }

      // 3. Update user_preferences table in Supabase Cloud DB
      const { error: prefError } = await supabase.from('user_preferences').upsert({
        user_id: profile.id,
        preferred_audio: preferredAudio,
        autoplay,
        autoplay_next: autoplayNext,
        skip_intro: skipIntro,
        skip_outro: skipOutro,
        updated_at: updatedAt
      }, { onConflict: 'user_id' });

      if (prefError) {
        console.error('[Supabase Preferences Update Error]', prefError);
        throw new Error(prefError.message || 'Failed to update preferences in database');
      }

      // 4. Update Supabase Auth Metadata
      await supabase.auth.updateUser({
        data: {
          username: cleanUsername,
          display_name: cleanDisplayName,
          avatar_url: cleanAvatarUrl
        }
      }).catch(() => {});

      // 5. Update local storage audio preference
      localStorage.setItem('aniworld_preferred_audio', preferredAudio);

      // 6. Re-fetch cloud profile from database to confirm UI matches DB
      await refreshProfile();

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3500);
    } catch (err: any) {
      console.error('[SETTINGS SAVE ERROR]', err);
      setErrorMsg(err?.message || 'Failed to save changes to database. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const handleOpenDeleteModal = () => {
    setConfirmInputText('');
    setDeleteError(null);
    setShowDeleteModal(true);
  };

  const handleCloseDeleteModal = () => {
    if (isDeleting) return;
    setShowDeleteModal(false);
    setConfirmInputText('');
    setDeleteError(null);
  };

  const handleConfirmPermanentDelete = async () => {
    if (confirmInputText.trim() !== 'DELETE' || isDeleting) {
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);

    try {
      await deleteAccount();
      setShowDeleteModal(false);
      navigate('/login?account_deleted=true', { replace: true });
    } catch (err: any) {
      console.error('[DELETE ACCOUNT ERROR]', err);
      setDeleteError("We couldn't delete your account. Your account has NOT been deleted. Please try again.");
      setIsDeleting(false);
    }
  };

  if (authLoading && !profile) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-purple-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 font-sans text-white">
      {/* 1. Profile Header & Avatar Card */}
      <div className="bg-[#0D0D12] border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <img
            src={avatarUrl || profile?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
            alt={username || 'Profile'}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-purple-500/40 shadow-xl"
          />
          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">{displayName || username || 'Member'}</h1>
              <span className="bg-purple-600/30 text-purple-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-purple-500/40 uppercase">
                Member
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">@{username || 'user'} • {profile?.email}</p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="px-4 py-2.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/80 text-rose-300 font-extrabold text-xs rounded-xl transition flex items-center gap-2 cursor-pointer shadow-md"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>

      {/* 2. Stats Grid Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-[#0D0D12] border border-slate-800/80 rounded-2xl p-4 text-center space-y-1">
          <span className="text-xl sm:text-2xl font-black text-purple-400">{stats.watching}</span>
          <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Watching</span>
        </div>
        <div className="bg-[#0D0D12] border border-slate-800/80 rounded-2xl p-4 text-center space-y-1">
          <span className="text-xl sm:text-2xl font-black text-purple-400">{stats.completed}</span>
          <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Completed</span>
        </div>
        <div className="bg-[#0D0D12] border border-slate-800/80 rounded-2xl p-4 text-center space-y-1">
          <span className="text-xl sm:text-2xl font-black text-purple-400">{stats.planToWatch}</span>
          <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Plan to Watch</span>
        </div>
        <div className="bg-[#0D0D12] border border-slate-800/80 rounded-2xl p-4 text-center space-y-1">
          <span className="text-xl sm:text-2xl font-black text-purple-400">{stats.favorites}</span>
          <span className="text-xs font-bold text-slate-400 block uppercase tracking-wider">Favorites</span>
        </div>
      </div>

      {/* 3. Settings & Preferences Form */}
      <form onSubmit={handleSave} className="bg-[#0D0D12] border border-slate-800/90 rounded-3xl p-6 sm:p-8 space-y-6 shadow-2xl">
        <h3 className="text-base font-extrabold text-white flex items-center gap-2 border-b border-slate-800/80 pb-4">
          <Settings className="w-5 h-5 text-purple-400" />
          Profile Settings & Playback Preferences
        </h3>

        {errorMsg && (
          <div className="bg-rose-950/40 border border-rose-800 text-rose-300 text-xs p-3.5 rounded-2xl flex items-center gap-2 font-bold">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Profile Info Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Display Name <span className="text-slate-500 font-normal">(Can be same for other users)</span>
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-[#050507] text-white px-4 py-2.5 rounded-xl border border-slate-800 text-xs focus:outline-none focus:border-purple-500 font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">
              Unique Username <span className="text-purple-400 font-normal">(Must be unique)</span>
            </label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#050507] text-white px-4 py-2.5 rounded-xl border border-slate-800 text-xs focus:outline-none focus:border-purple-500 font-medium"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1">Avatar Image URL (Profile Picture / DP)</label>
          <input
            type="text"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            className="w-full bg-[#050507] text-white px-4 py-2.5 rounded-xl border border-slate-800 text-xs focus:outline-none focus:border-purple-500 font-medium"
          />
        </div>

        {/* Audio Mode Selection */}
        <div className="space-y-3 pt-2">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
            <Volume2 className="w-3.5 h-3.5 text-purple-400" />
            Preferred Audio Mode
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setPreferredAudio('sub')}
              className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                preferredAudio === 'sub'
                  ? 'bg-purple-600/20 border-purple-500 text-white shadow-lg ring-1 ring-purple-500/50'
                  : 'bg-[#050507] border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span className="font-extrabold text-xs block">SUB (Japanese Audio)</span>
              <span className="text-[10px] text-slate-400">Default Japanese track with soft subtitles</span>
            </button>

            <button
              type="button"
              onClick={() => setPreferredAudio('dub')}
              className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                preferredAudio === 'dub'
                  ? 'bg-purple-600/20 border-purple-500 text-white shadow-lg ring-1 ring-purple-500/50'
                  : 'bg-[#050507] border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span className="font-extrabold text-xs block">DUB (English Dubbed)</span>
              <span className="text-[10px] text-slate-400">English voice dub track where available</span>
            </button>
          </div>
        </div>

        {/* Player Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/80">
          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#050507] border border-slate-800 text-xs font-bold text-slate-300 cursor-pointer">
            <span>Autoplay Video</span>
            <input
              type="checkbox"
              checked={autoplay}
              onChange={(e) => setAutoplay(e.target.checked)}
              className="accent-purple-600 w-4 h-4 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#050507] border border-slate-800 text-xs font-bold text-slate-300 cursor-pointer">
            <span>Autoplay Next Episode</span>
            <input
              type="checkbox"
              checked={autoplayNext}
              onChange={(e) => setAutoplayNext(e.target.checked)}
              className="accent-purple-600 w-4 h-4 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#050507] border border-slate-800 text-xs font-bold text-slate-300 cursor-pointer">
            <span>Auto-Skip Intro</span>
            <input
              type="checkbox"
              checked={skipIntro}
              onChange={(e) => setSkipIntro(e.target.checked)}
              className="accent-purple-600 w-4 h-4 cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-3.5 rounded-2xl bg-[#050507] border border-slate-800 text-xs font-bold text-slate-300 cursor-pointer">
            <span>Auto-Skip Outro</span>
            <input
              type="checkbox"
              checked={skipOutro}
              onChange={(e) => setSkipOutro(e.target.checked)}
              className="accent-purple-600 w-4 h-4 cursor-pointer"
            />
          </label>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-4">
          {savedSuccess ? (
            <span className="text-xs font-extrabold text-emerald-400 flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-800/80 px-3 py-1.5 rounded-xl">
              <Check className="w-4 h-4 text-emerald-400" /> All preferences saved to Supabase Cloud!
            </span>
          ) : <span />}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleOpenDeleteModal}
              className="px-4 py-2.5 text-xs text-rose-400 hover:text-rose-300 font-extrabold transition cursor-pointer flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Account</span>
            </button>

            <button
              type="submit"
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-purple-950/60 transition cursor-pointer flex items-center gap-2"
            >
              {saving && <Loader2 className="w-4 h-4 animate-spin text-white" />}
              <span>{saving ? 'Saving to Database...' : 'Save Changes'}</span>
            </button>
          </div>
        </div>
      </form>

      {/* Double Confirmation Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0D0D12] border border-rose-900/60 rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-5 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={handleCloseDeleteModal}
              disabled={isDeleting}
              className="absolute top-5 right-5 p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800 transition cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 text-rose-400 border-b border-slate-800 pb-4">
              <div className="w-10 h-10 rounded-2xl bg-rose-950/80 border border-rose-800/80 flex items-center justify-center shrink-0">
                <ShieldAlert className="w-5 h-5 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-black text-white">Delete your account permanently?</h3>
                <p className="text-[11px] text-rose-400 font-semibold">Critical Destructive Action</p>
              </div>
            </div>

            {deleteError && (
              <div className="bg-rose-950/80 border border-rose-800 text-rose-200 text-xs p-3.5 rounded-2xl font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="space-y-2 text-xs text-slate-300 leading-relaxed bg-[#050507] p-4 rounded-2xl border border-slate-800/80">
              <p className="font-bold text-white mb-2">This will permanently delete:</p>
              <ul className="space-y-1.5 pl-1 text-slate-400 font-medium">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Your account identity & login access
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Your profile details & username handle
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Saved favorites & watchlist items
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Watch history & playback progress
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Personal player preferences & settings
                </li>
              </ul>
              <div className="pt-2 text-rose-400 font-extrabold text-[11px] uppercase tracking-wider">
                ⚠️ This action cannot be undone.
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-300">
                Type <span className="text-rose-400 font-mono font-black">DELETE</span> to confirm:
              </label>
              <input
                type="text"
                disabled={isDeleting}
                value={confirmInputText}
                onChange={(e) => setConfirmInputText(e.target.value)}
                placeholder="DELETE"
                className="w-full bg-[#050507] text-white placeholder-slate-600 px-4 py-3 rounded-xl border border-rose-900/60 focus:outline-none focus:border-rose-500 text-xs font-mono font-bold tracking-wider"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleCloseDeleteModal}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 cursor-pointer transition disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmPermanentDelete}
                disabled={confirmInputText.trim() !== 'DELETE' || isDeleting}
                className={`px-5 py-2.5 rounded-xl text-xs font-extrabold text-white transition flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-950/60 ${
                  confirmInputText.trim() === 'DELETE' && !isDeleting
                    ? 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700'
                    : 'bg-rose-950/40 text-slate-500 border border-rose-900/40 cursor-not-allowed'
                }`}
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Deleting account...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Permanently</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
