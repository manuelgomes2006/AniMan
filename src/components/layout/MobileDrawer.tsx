import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  X, Home, Compass, Flame, Play, Filter, Calendar, Bookmark,
  History, Settings, User, Tv, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import UserProfileModal from '../common/UserProfileModal';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const location = useLocation();
  const { profile } = useAuth();
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  if (!isOpen) return null;

  const username = profile?.displayName || profile?.username || 'Member';
  const handleName = profile?.username || 'user';
  const email = profile?.email || 'user@animan.io';
  const avatarUrl = profile?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80';

  const menuItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Browse', path: '/browse', icon: Compass },
    { label: 'Trending', path: '/browse?sort=TRENDING_DESC', icon: Flame },
    { label: 'Latest Episodes', path: '/browse?tab=latest', icon: Play },
    { label: 'Genres', path: '/browse?tab=genres', icon: Filter },
    { label: 'Schedule', path: '/schedule', icon: Calendar },
    { label: 'Watchlist', path: '/watchlist', icon: Bookmark },
    { label: 'History', path: '/watchlist?tab=history', icon: History },
  ];

  return (
    <>
      <div className="fixed inset-0 z-50 md:hidden flex font-sans">
        {/* Dark Overlay */}
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        />

        {/* Slide-In Side Drawer Container */}
        <div className="relative w-4/5 max-w-xs bg-[#0D0D12] border-r border-slate-800/80 h-full flex flex-col justify-between p-5 z-10 shadow-2xl overflow-y-auto">
          <div>
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-6">
              <Link to="/" onClick={onClose} className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-600 flex items-center justify-center border border-purple-500/30">
                  <Tv className="w-4 h-4 text-white" />
                </div>
                <span className="font-black text-lg text-white">
                  Ani<span className="text-purple-400">Man</span>
                </span>
              </Link>
              <button
                onClick={onClose}
                className="p-1 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Interactive User Badge Card */}
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="w-full flex items-center gap-3 p-3 bg-[#050507] hover:bg-slate-900 rounded-2xl border border-slate-800/80 mb-6 text-left transition cursor-pointer"
            >
              <img
                src={avatarUrl}
                alt={username}
                className="w-10 h-10 rounded-full object-cover border border-purple-500/40 shrink-0"
              />
              <div className="min-w-0">
                <span className="font-bold text-xs text-white block truncate">{username}</span>
                <span className="text-[10px] text-purple-300 font-semibold truncate block">{email}</span>
              </div>
            </button>

            {/* Menu Links */}
            <div className="space-y-1">
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.label}
                    to={item.path}
                    onClick={onClose}
                    className={`flex items-center justify-between p-3 rounded-xl text-xs font-bold transition ${
                      isActive
                        ? 'bg-purple-600/20 text-purple-400 border border-purple-500/40'
                        : 'text-slate-300 hover:text-white hover:bg-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="border-t border-slate-800/80 pt-4 space-y-1">
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="w-full flex items-center gap-3 p-3 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900 text-left transition cursor-pointer"
            >
              <User className="w-4 h-4 text-purple-400" />
              <span>User Details & Status</span>
            </button>
            <Link
              to="/profile"
              onClick={onClose}
              className="flex items-center gap-3 p-3 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900"
            >
              <Settings className="w-4 h-4 text-purple-400" />
              <span>App Preferences</span>
            </Link>
          </div>
        </div>
      </div>

      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
}
