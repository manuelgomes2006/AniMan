import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Search, Bell, User, Tv, Bookmark } from 'lucide-react';
import { getUserProfile } from '../../services/userStore';

interface NavbarProps {
  onOpenSearch: () => void;
}

export default function Navbar({ onOpenSearch }: NavbarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getUserProfile();
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className="sticky top-0 z-50 bg-[#050507]/90 backdrop-blur-xl border-b border-slate-900/80 transition-all">
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-4">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2 group shrink-0">
          <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-950/60 group-hover:scale-105 transition-transform border border-purple-500/30">
            <Tv className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
          </div>
          <div className="flex flex-col">
            <span className="font-black text-lg sm:text-xl tracking-tight text-white flex items-center gap-1">
              Ani<span className="text-purple-400">Verse</span>
            </span>
            <span className="text-[8px] sm:text-[9px] uppercase tracking-widest text-purple-400 font-semibold -mt-1">
              アニメ • Streaming
            </span>
          </div>
        </Link>

        {/* Desktop Primary Nav Links (Hidden on Mobile) */}
        <div className="hidden md:flex items-center gap-1 font-medium text-sm">
          <Link
            to="/"
            className={`px-4 py-2 rounded-xl transition ${
              isActive('/') ? 'text-white bg-purple-600/20 border border-purple-500/40 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Home
          </Link>
          <Link
            to="/browse"
            className={`px-4 py-2 rounded-xl transition ${
              isActive('/browse') ? 'text-white bg-purple-600/20 border border-purple-500/40 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Browse
          </Link>
          <Link
            to="/browse?tab=genres"
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition"
          >
            Genres
          </Link>
          <Link
            to="/schedule"
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition"
          >
            Schedule
          </Link>
          <Link
            to="/community"
            className="px-4 py-2 rounded-xl text-slate-400 hover:text-white transition"
          >
            Community
          </Link>
        </div>

        {/* Desktop Search Bar (Hidden on Mobile) */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={onOpenSearch}
            className="relative flex items-center gap-2 bg-[#0D0D12] text-slate-400 hover:text-white px-4 py-2 rounded-full border border-slate-800 text-xs w-44 sm:w-64 transition hover:border-purple-500/50 shadow-inner group"
          >
            <Search className="w-4 h-4 text-slate-400 group-hover:text-purple-400" />
            <span className="truncate">Search anime...</span>
            <kbd className="hidden sm:inline-block ml-auto bg-slate-900 text-[10px] text-slate-500 px-1.5 py-0.5 rounded border border-slate-800 font-mono">
              /
            </kbd>
          </button>

          <button
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-900 rounded-xl relative transition"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          </button>

          <div className="relative">
            <button
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              className="flex items-center gap-2 p-0.5 rounded-full border-2 border-purple-500/40 hover:border-purple-400 transition"
            >
              <img
                src={user.avatar}
                alt={user.username}
                className="w-8 h-8 rounded-full object-cover"
              />
            </button>

            {showProfileMenu && (
              <div className="absolute right-0 top-11 w-56 bg-[#0D0D12] border border-slate-800 rounded-2xl p-2 shadow-2xl z-50 text-xs space-y-1">
                <div className="px-3 py-2 border-b border-slate-800/80 mb-1">
                  <span className="font-bold text-white block">{user.username}</span>
                  <span className="text-[10px] text-slate-400">{user.email}</span>
                </div>

                <Link
                  to="/watchlist"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl"
                >
                  <Bookmark className="w-4 h-4 text-purple-400" />
                  My Watchlist
                </Link>

                <Link
                  to="/profile"
                  onClick={() => setShowProfileMenu(false)}
                  className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800/60 rounded-xl"
                >
                  <User className="w-4 h-4 text-purple-400" />
                  Profile Settings
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Mobile Header Actions (Matching Mockup 1: Search, Notification Bell, Profile Avatar) */}
        <div className="flex md:hidden items-center gap-3">
          <button
            onClick={onOpenSearch}
            className="p-2 text-slate-300 hover:text-white rounded-full bg-[#0D0D12] border border-slate-800"
            title="Search"
          >
            <Search className="w-4 h-4 text-slate-300" />
          </button>

          <button
            className="p-2 text-slate-300 hover:text-white rounded-full bg-[#0D0D12] border border-slate-800 relative"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
          </button>

          <Link to="/profile" className="p-0.5 rounded-full border border-purple-500/50">
            <img
              src={user.avatar}
              alt={user.username}
              className="w-7 h-7 rounded-full object-cover"
            />
          </Link>
        </div>

      </div>
    </nav>
  );
}
