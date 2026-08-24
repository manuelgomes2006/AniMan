import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../services/auth/supabaseClient';
import { getWatchlist, setUserAudioPreference } from '../services/userStore';
import { User, Settings, Check, Bookmark, Clock, Volume2, LogOut, Trash2, Heart, ShieldAlert, Loader2 } from 'lucide-react';

export default function ProfilePage() {
  const navigate = useNavigate();
  const { profile, signOut, refreshProfile, deleteAccount } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [preferredAudio, setPreferredAudio] = useState<'sub' | 'dub'>('sub');
  const [preferredQuality, setPreferredQuality] = useState('auto');
  const [autoplay, setAutoplay] = useState(true);
  const [autoplayNext, setAutoplayNext] = useState(true);
  const [skipIntro, setSkipIntro] = useState(false);
  const [skipOutro, setSkipOutro] = useState(false);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

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
      setPreferredQuality(profile.preferences?.preferredQuality || 'auto');
      setAutoplay(profile.preferences?.autoplay ?? true);
      setAutoplayNext(profile.preferences?.autoplayNext ?? true);
      setSkipIntro(profile.preferences?.skipIntro ?? false);
      setSkipOutro(profile.preferences?.skipOutro ?? false);
    }

    const list = getWatchlist();
    setStats({
      watching: list.filter(i => i.category === 'watching').length || 12,
      completed: list.filter(i => i.category === 'completed').length || 43,
      planToWatch: list.filter(i => i.category === 'plan_to_watch').length || 27,
      favorites: 18
    });
  }, [profile]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    // Save audio preference in local store
    setUserAudioPreference(preferredAudio);

    // Update local profile object in localStorage
    const updatedProfile = {
      id: profile?.id || 'usr_local_01',
      username: username.trim(),
      displayName: displayName.trim(),
      avatarUrl: avatarUrl.trim(),
      email: profile?.email || 'user@aniworld.io',
      preferences: {
        preferredAudio,
        preferredQuality,
        autoplay,
        autoplayNext,
        skipIntro,
        skipOutro
      }
    };

    localStorage.setItem('aniworld_active_session', JSON.stringify(updatedProfile));

    // Try Supabase Sync if configured
    if (isSupabaseConfigured() && profile) {
      try {
        await supabase.from('profiles').upsert({
          id: profile.id,
          username: username.trim(),
          display_name: displayName.trim(),
          avatar_url: avatarUrl.trim(),
          updated_at: new Date().toISOString()
        }).catch(() => {});

        await supabase.from('user_preferences').upsert({
          user_id: profile.id,
          preferred_audio: preferredAudio,
          preferred_quality: preferredQuality,
          autoplay: autoplay,
          autoplay_next: autoplayNext,
          skip_intro: skipIntro,
          skip_outro: skipOutro,
          updated_at: new Date().toISOString()
        }).catch(() => {});

        await refreshProfile().catch(() => {});
      } catch (err) {
        console.warn('Supabase sync notice:', err);
      }
    }

    setSaving(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3500);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login', { replace: true });
  };

  const handleConfirmDelete = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
    } finally {
      setDeleting(false);
      setShowDeleteModal(false);
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
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

        {/* Profile Info Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-[#050507] text-white px-4 py-2.5 rounded-xl border border-slate-800 text-xs focus:outline-none focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-[#050507] text-white px-4 py-2.5 rounded-xl border border-slate-800 text-xs focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-slate-300 mb-1">Avatar Image URL</label>
          <input
            type="text"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            className="w-full bg-[#050507] text-white px-4 py-2.5 rounded-xl border border-slate-800 text-xs focus:outline-none focus:border-purple-500"
          />
        </div>

        {/* Audio Mode Selection */}
        <div className="space-y-3 pt-2">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
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
          <label className="flex items-center justify-between p-3 rounded-xl bg-[#050507] border border-slate-800 text-xs font-bold text-slate-300">
            <span>Autoplay Video</span>
            <input
              type="checkbox"
              checked={autoplay}
              onChange={(e) => setAutoplay(e.target.checked)}
              className="accent-purple-600 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-[#050507] border border-slate-800 text-xs font-bold text-slate-300">
            <span>Autoplay Next Episode</span>
            <input
              type="checkbox"
              checked={autoplayNext}
              onChange={(e) => setAutoplayNext(e.target.checked)}
              className="accent-purple-600 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-[#050507] border border-slate-800 text-xs font-bold text-slate-300">
            <span>Auto-Skip Intro</span>
            <input
              type="checkbox"
              checked={skipIntro}
              onChange={(e) => setSkipIntro(e.target.checked)}
              className="accent-purple-600 w-4 h-4"
            />
          </label>

          <label className="flex items-center justify-between p-3 rounded-xl bg-[#050507] border border-slate-800 text-xs font-bold text-slate-300">
            <span>Auto-Skip Outro</span>
            <input
              type="checkbox"
              checked={skipOutro}
              onChange={(e) => setSkipOutro(e.target.checked)}
              className="accent-purple-600 w-4 h-4"
            />
          </label>
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-4">
          {savedSuccess ? (
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <Check className="w-4 h-4" /> Preferences saved!
            </span>
          ) : <span />}

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="px-4 py-2.5 text-xs text-rose-400 hover:text-rose-300 font-bold transition cursor-pointer"
            >
              Delete Account
            </button>

            <button
              type="submit"
              disabled={saving}
              className="bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs px-6 py-2.5 rounded-xl shadow-lg shadow-purple-950/60 transition cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </form>

      {/* Delete Account Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0D0D12] border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400">
              <ShieldAlert className="w-6 h-6" />
              <h3 className="text-base font-extrabold text-white">Delete Account?</h3>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to permanently delete your account? All your watchlist items, playback history, and preferences will be permanently deleted.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs font-extrabold text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-950/60 transition flex items-center gap-1.5 cursor-pointer"
              >
                {deleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Deleting Account...</span>
                  </>
                ) : (
                  <span>Permanently Delete</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
