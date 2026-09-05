import React, { useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { X, User, Bookmark, Settings, LogOut, ShieldCheck, Mail, Camera, Loader2 } from 'lucide-react';
import { processImageFile } from '../../utils/imageUpload';
import { supabase } from '../../services/auth/supabaseClient';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function UserProfileModal({ isOpen, onClose }: UserProfileModalProps) {
  const navigate = useNavigate();
  const { user, profile, signOut, refreshProfile } = useAuth();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  if (!isOpen) return null;

  const username = profile?.displayName || profile?.username || 'Member';
  const handleName = profile?.username || 'user';
  const email = profile?.email || 'user@animan.io';
  const avatarUrl = profile?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80';

  const handleDeviceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploading(true);
      const dataUrl = await processImageFile(file, 400, 0.88);

      if (profile?.id) {
        await supabase.from('profiles').upsert({
          id: profile.id,
          avatar_url: dataUrl,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

        await supabase.auth.updateUser({
          data: { avatar_url: dataUrl }
        }).catch(() => {});

        await refreshProfile();
      }
    } catch (err) {
      console.error('Failed to upload DP:', err);
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleSignOut = async () => {
    onClose();
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans">
      {/* Backdrop Overlay */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
      />

      {/* Pop-up Card Container */}
      <div className="relative w-full max-w-sm bg-[#0D0D12] border border-slate-800 rounded-3xl p-6 shadow-2xl z-10 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header with Close Button */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
          <div className="flex items-center gap-2 text-white font-extrabold text-sm">
            <User className="w-4 h-4 text-purple-400" />
            <span>{user ? 'User Account Details' : 'Guest Account'}</span>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl bg-slate-900 border border-slate-800 transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {!user ? (
          /* Guest Mode Card */
          <div className="space-y-4">
            <div className="text-center py-4 px-2 space-y-2">
              <div className="w-16 h-16 rounded-full bg-purple-950/60 border border-purple-800/60 flex items-center justify-center text-purple-400 mx-auto mb-3 shadow-lg shadow-purple-950/80">
                <User className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-white">Welcome to AniMan!</h3>
              <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
                Sign in to your account to save anime to your watchlist, resume episodes seamlessly across devices, and personalize your profile.
              </p>
            </div>

            <div className="space-y-2 pt-2">
              <Link
                to="/login"
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 py-3 bg-purple-600 hover:bg-purple-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-purple-950/60 transition cursor-pointer"
              >
                <span>Sign In to Your Account</span>
              </Link>
              <Link
                to="/signup"
                onClick={onClose}
                className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                <span>Create New Account</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Authenticated Member Details */
          <>
            {/* User Details Section with Device DP Upload */}
            <div className="flex items-center gap-4 bg-[#050507] p-4 rounded-2xl border border-slate-800">
              <div className="relative group shrink-0">
                <img
                  src={avatarUrl}
                  alt={username}
                  className="w-14 h-14 rounded-full object-cover border-2 border-purple-500/50 shadow-md"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploading}
                  className="absolute -bottom-1 -right-1 p-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-full shadow-lg border border-[#050507] transition transform hover:scale-110 cursor-pointer disabled:opacity-50"
                  title="Upload photo from device"
                >
                  {isUploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Camera className="w-3 h-3" />}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif,image/*"
                  onChange={handleDeviceUpload}
                  className="hidden"
                />
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-1.5">
                  <h3 className="text-base font-black text-white truncate">{username}</h3>
                  <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0" />
                </div>
                <p className="text-xs font-bold text-slate-300 truncate">@{handleName}</p>
                <div className="flex items-center gap-1 text-[11px] text-purple-300 font-semibold truncate pt-0.5">
                  <Mail className="w-3 h-3 text-purple-400 shrink-0" />
                  <span className="truncate">{email}</span>
                </div>
              </div>
            </div>

            {/* Account Info Details */}
            <div className="space-y-2 text-xs bg-purple-950/20 border border-purple-800/40 p-3 rounded-2xl">
              <div className="flex items-center justify-between text-slate-400 font-medium">
                <span>Username:</span>
                <span className="font-bold text-white">@{handleName}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400 font-medium">
                <span>Email Address:</span>
                <span className="font-bold text-purple-300 truncate max-w-[180px]">{email}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400 font-medium">
                <span>Account Status:</span>
                <span className="font-extrabold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-800/60">
                  Verified Member
                </span>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2 pt-1">
              <Link
                to="/watchlist"
                onClick={onClose}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 text-xs font-bold transition"
              >
                <div className="flex items-center gap-2">
                  <Bookmark className="w-4 h-4 text-purple-400" />
                  <span>My Saved Watchlist</span>
                </div>
              </Link>

              <Link
                to="/profile"
                onClick={onClose}
                className="w-full flex items-center justify-between px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white border border-slate-800 text-xs font-bold transition"
              >
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-purple-400" />
                  <span>Edit Profile & Preferences</span>
                </div>
              </Link>

              <button
                onClick={handleSignOut}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/80 text-xs font-extrabold transition cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
