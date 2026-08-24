import React, { useState } from 'react';
import { getUserProfile, updateUserProfile } from '../services/userStore';
import { AudioVariant } from '../types/stream';
import { User, Settings, Check, Bookmark, Clock, Volume2 } from 'lucide-react';

export default function ProfilePage() {
  const [profile, setProfile] = useState(getUserProfile());
  const [audioPref, setAudioPref] = useState<AudioVariant>(profile.preferredAudio || 'sub');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = updateUserProfile({ preferredAudio: audioPref });
    setProfile(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-16">
      {/* Profile Header */}
      <div className="bg-[#0D0D12] border border-slate-800/80 rounded-3xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 shadow-xl">
        <img
          src={profile.avatar}
          alt={profile.username}
          className="w-24 h-24 rounded-full object-cover border-4 border-purple-500/40 shadow-xl"
        />
        <div className="text-center sm:text-left space-y-1">
          <div className="flex items-center justify-center sm:justify-start gap-2">
            <h1 className="text-2xl font-black text-white">{profile.username}</h1>
            <span className="bg-purple-600/30 text-purple-400 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full border border-purple-500/40 uppercase">
              Pro Member
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium">{profile.email}</p>
        </div>
      </div>

      {/* Preferences Form */}
      <form onSubmit={handleSave} className="bg-[#0D0D12] border border-slate-800/80 rounded-3xl p-6 space-y-6 shadow-xl">
        <h3 className="text-base font-extrabold text-white flex items-center gap-2">
          <Settings className="w-5 h-5 text-purple-400" />
          Playback & Audio Preferences
        </h3>

        <div className="space-y-3">
          <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
            Default Audio Language
          </label>
          <div className="grid grid-cols-2 gap-4">
            <button
              type="button"
              onClick={() => setAudioPref('sub')}
              className={`p-4 rounded-2xl border text-left transition ${
                audioPref === 'sub'
                  ? 'bg-purple-600/20 border-purple-500 text-white shadow-lg ring-2 ring-purple-500/30'
                  : 'bg-[#050507] border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span className="font-extrabold text-sm block">SUB (Japanese Audio)</span>
              <span className="text-xs text-slate-400">Original Japanese audio track with English subtitles</span>
            </button>

            <button
              type="button"
              onClick={() => setAudioPref('dub')}
              className={`p-4 rounded-2xl border text-left transition ${
                audioPref === 'dub'
                  ? 'bg-purple-600/20 border-purple-500 text-white shadow-lg ring-2 ring-purple-500/30'
                  : 'bg-[#050507] border-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              <span className="font-extrabold text-sm block">DUB (English Dubbed)</span>
              <span className="text-xs text-slate-400">English voice dub track where available</span>
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          {savedSuccess ? (
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <Check className="w-4 h-4" /> Preferences saved!
            </span>
          ) : <span />}

          <button
            type="submit"
            className="bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs px-6 py-3 rounded-2xl shadow-xl shadow-purple-950/50 transition-all hover:scale-105"
          >
            Save Preferences
          </button>
        </div>
      </form>
    </div>
  );
}
