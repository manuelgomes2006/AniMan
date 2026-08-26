import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../services/auth/supabaseClient';
import { getWatchlist, setUserAudioPreference } from '../services/userStore';
import { Settings, Check, LogOut, ShieldAlert, Loader2, AlertCircle, Trash2, X, Upload, Globe, Volume2, Video } from 'lucide-react';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { profile, user, signOut, refreshProfile, deleteAccount } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [preferredAudio, setPreferredAudio] = useState<'sub' | 'dub'>('sub');
  const [preferredLanguage, setPreferredLanguage] = useState('English');
  const [preferredQuality, setPreferredQuality] = useState('auto');
  const [autoplay, setAutoplay] = useState(true);
  const [autoplayNext, setAutoplayNext] = useState(true);
  const [autoPause, setAutoPause] = useState(false);
  const [skipIntro, setSkipIntro] = useState(false);
  const [skipOutro, setSkipOutro] = useState(false);

  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
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

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || profile.username);
      setUsername(profile.username);
      setAvatarUrl(profile.avatarUrl);
      setPreferredAudio(profile.preferences?.preferredAudio || 'sub');
      setPreferredLanguage(profile.preferences?.preferredLanguage || 'English');
      setPreferredQuality(profile.preferences?.preferredQuality || 'auto');
      setAutoplay(profile.preferences?.autoplay ?? true);
      setAutoplayNext(profile.preferences?.autoplayNext ?? true);
      setAutoPause(profile.preferences?.autoPause ?? false);
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
  }, [profile]);

  // Handle Avatar Image File Upload via Supabase Storage
  const handleAvatarFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !isSupabaseConfigured()) return;

    setUploadingAvatar(true);
    setErrorMsg(null);

    try {
      const fileExt = file.name.split('.').pop() || 'png';
      const filePath = `${user.id}/avatar_${Date.now()}.${fileExt}`;

      // Upload to Supabase Storage bucket 'avatars'
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true });

      if (uploadError) {
        console.warn('[Avatar Upload Notice]:', uploadError.message);
        // If storage bucket is missing, create object URL as fallback preview
        const previewUrl = URL.createObjectURL(file);
        setAvatarUrl(previewUrl);
        setUploadingAvatar(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      setAvatarUrl(publicUrl);
    } catch (err: any) {
      console.warn('[Avatar Upload Exception]:', err);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setErrorMsg(null);
    setSavedSuccess(false);

    if (!user || !profile || !isSupabaseConfigured()) {
      setErrorMsg('No active Supabase session found. Please sign in again.');
      setSaving(false);
      return;
    }

    const cleanUsername = username.trim().toLowerCase();
    const cleanEmail = (profile.email || user.email || '').trim().toLowerCase();
    const nowIso = new Date().toISOString();

    // 1. Validate Username Uniqueness via Supabase Database
    if (cleanUsername !== profile.username.toLowerCase()) {
      const { data: existing, error: checkErr } = await supabase
        .from('profiles')
        .select('id, username')
        .eq('username', cleanUsername)
        .maybeSingle();

      if (checkErr) {
        console.error('[Username Check Error]:', checkErr.message);
      }

      if (existing && existing.id !== user.id) {
        setErrorMsg(`Username '@${cleanUsername}' is already taken by another user. Please pick a unique handle.`);
        setSaving(false);
        return;
      }
    }

    // 2. Save audio preference in local player store
    setUserAudioPreference(preferredAudio);

    // 3. UPDATE Supabase `profiles` table first
    const { error: profileError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: cleanEmail,
        username: cleanUsername,
        display_name: displayName.trim(),
        avatar_url: avatarUrl.trim(),
        updated_at: nowIso
      }, { onConflict: 'id' });

    if (profileError) {
      console.error('[Profile Update Failed]:', profileError.message);
      setErrorMsg(`Failed to save profile changes: ${profileError.message}`);
      setSaving(false);
      return;
    }

    // 4. UPSERT Supabase `user_preferences` table second
    const { error: prefError } = await supabase
      .from('user_preferences')
      .upsert({
        user_id: user.id,
        preferred_audio: preferredAudio,
        preferred_language: preferredLanguage,
        preferred_quality: preferredQuality,
        autoplay: autoplay,
        autoplay_next: autoplayNext,
        auto_pause: autoPause,
        skip_intro: skipIntro,
        skip_outro: skipOutro,
        updated_at: nowIso
      }, { onConflict: 'user_id' });

    if (prefError) {
      console.error('[Preferences Update Failed]:', prefError.message);
      setErrorMsg(`Failed to save preferences: ${prefError.message}`);
      setSaving(false);
      return;
    }

    // Sync metadata back to Supabase Auth User Metadata
    await supabase.auth.updateUser({
      data: {
        username: cleanUsername,
        display_name: displayName.trim(),
        avatar_url: avatarUrl.trim()
      }
    }).catch(() => {});

    // 5. Re-fetch confirmed cloud data to update React state
    await refreshProfile().catch(() => {});

    setSaving(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
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

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16 font-sans">
      {/* 1. Profile Header & Avatar Card */}
      <div className="bg-[#0D0D12] border border-slate-800/90 rounded-3xl p-6 sm:p-8 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
          <img
            src={avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80'}
            alt={profile?.username || 'Profile'}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-purple-500/40 shadow-xl"
          />
          <div className="space-y-1">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-white">{displayName || username}</h1>
              <span className="bg-purple-600/30 text-purple-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-purple-500/40 uppercase">
                Member
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">@{username} • {profile?.email}</p>
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
          <div className="bg-rose-950/60 border border-rose-800 text-rose-200 text-xs p-4 rounded-2xl flex items-center gap-2 font-bold leading-relaxed">
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

        {/* Avatar Image URL & File Upload */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-300 mb-1">Avatar Image URL / Upload Picture</label>
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <input
              type="text"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              className="w-full bg-[#050507] text-white px-4 py-2.5 rounded-xl border border-slate-800 text-xs focus:outline-none focus:border-purple-500 font-medium"
            />
            <label className="w-full sm:w-auto px-4 py-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 hover:text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shrink-0">
              <Upload className={`w-4 h-4 text-purple-400 ${uploadingAvatar ? 'animate-bounce' : ''}`} />
              <span>{uploadingAvatar ? 'Uploading...' : 'Upload File'}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleAvatarFileUpload}
                className="hidden"
                disabled={uploadingAvatar}
              />
            </label>
          </div>
        </div>

        {/* Preferred Language & Audio Mode Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-purple-400" />
              <span>Preferred Language</span>
            </label>
            <select
              value={preferredLanguage}
              onChange={(e) => setPreferredLanguage(e.target.value)}
              className="w-full bg-[#050507] text-white px-4 py-2.5 rounded-xl border border-slate-800 text-xs focus:outline-none focus:border-purple-500 font-medium cursor-pointer"
            >
              <option value="English">English</option>
              <option value="Japanese">Japanese</option>
              <option value="Spanish">Spanish</option>
              <option value="German">German</option>
              <option value="French">French</option>
              <option value="Hindi">Hindi</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1 flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-purple-400" />
              <span>Preferred Audio Track</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPreferredAudio('sub')}
                className={`py-2 px-3 rounded-xl border text-center transition cursor-pointer text-xs font-extrabold ${
                  preferredAudio === 'sub'
                    ? 'bg-purple-600/20 border-purple-500 text-white shadow-md'
                    : 'bg-[#050507] border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                SUB (Japanese)
              </button>

              <button
                type="button"
                onClick={() => setPreferredAudio('dub')}
                className={`py-2 px-3 rounded-xl border text-center transition cursor-pointer text-xs font-extrabold ${
                  preferredAudio === 'dub'
                    ? 'bg-purple-600/20 border-purple-500 text-white shadow-md'
                    : 'bg-[#050507] border-slate-800 text-slate-400 hover:text-white'
                }`}
              >
                DUB (English)
              </button>
            </div>
          </div>
        </div>

        {/* Player Toggles */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-800/80">
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
            <span>Auto-Pause on Unfocus</span>
            <input
              type="checkbox"
              checked={autoPause}
              onChange={(e) => setAutoPause(e.target.checked)}
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
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-4">
          {savedSuccess ? (
            <span className="text-xs font-extrabold text-emerald-400 flex items-center gap-1.5 bg-emerald-950/40 border border-emerald-800/80 px-3 py-1.5 rounded-xl animate-in fade-in duration-200">
              <Check className="w-4 h-4 text-emerald-400" /> All changes saved to Supabase cloud!
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
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving to Cloud...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
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
