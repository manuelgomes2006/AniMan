import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  X, Home, Compass, Flame, Play, Filter, Calendar, Bookmark,
  History, Settings, User, Tv, ChevronRight
} from 'lucide-react';
import { getUserProfile } from '../../services/userStore';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MobileDrawer({ isOpen, onClose }: MobileDrawerProps) {
  const location = useLocation();
  const user = getUserProfile();

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 md:hidden flex">
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
                Ani<span className="text-purple-400">World</span>
              </span>
            </Link>
            <button
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Badge */}
          <div className="flex items-center gap-3 p-3 bg-[#050507] rounded-2xl border border-slate-800/80 mb-6">
            <img
              src={user.avatar}
              alt={user.username}
              className="w-10 h-10 rounded-full object-cover border border-purple-500/40 shrink-0"
            />
            <div className="min-w-0">
              <span className="font-bold text-xs text-white block truncate">{user.username}</span>
              <span className="text-[10px] text-purple-400 font-semibold uppercase">Pro Member</span>
            </div>
          </div>

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
          <Link
            to="/profile"
            onClick={onClose}
            className="flex items-center gap-3 p-3 rounded-xl text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-900"
          >
            <User className="w-4 h-4 text-purple-400" />
            <span>Profile Settings</span>
          </Link>
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
  );
}
