import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Search, Menu, Tv, Bookmark, User, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import MobileDrawer from './MobileDrawer';
import MobileSearchModal from '../common/MobileSearchModal';
import UserProfileModal from '../common/UserProfileModal';

import logoImg from '../../assets/logo.jpg';

interface NavbarProps {
  onOpenSearch: () => void;
}

export default function Navbar({ onOpenSearch }: NavbarProps) {
  const location = useLocation();
  const { profile } = useAuth();
  
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isMobileSearchOpen, setIsMobileSearchOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const username = profile?.displayName || profile?.username || 'Member';
  const avatarUrl = profile?.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80';

  const handleOpenProfileModal = () => {
    setIsProfileModalOpen(true);
  };

  return (
    <>
      <nav className="sticky top-0 z-50 bg-[#050507]/90 backdrop-blur-md border-b border-slate-900/80 transition-all h-14 sm:h-16 flex items-center justify-between px-4 sm:px-8 font-sans">
        <div className="max-w-[1600px] w-full mx-auto flex items-center justify-between gap-4">
          
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-2.5 group shrink-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-full overflow-hidden group-hover:scale-105 transition-transform border-2 border-purple-500/60 shadow-lg shadow-purple-950/60 shrink-0 bg-black">
              <img src={logoImg} alt="AniMan Logo" className="w-full h-full object-cover" />
            </div>
            <div className="flex flex-col">
              <span className="font-black text-lg sm:text-xl tracking-tight text-white flex items-center gap-1">
                Ani<span className="text-purple-400">Man</span>
              </span>
              <span className="text-[8px] sm:text-[9px] uppercase tracking-widest text-purple-400 font-semibold -mt-1">
                アニメ • Streaming
              </span>
            </div>
          </Link>

          {/* DESKTOP NAV LINKS */}
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
          </div>

          {/* DESKTOP SEARCH & PROFILE CIRCLE BUTTON */}
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

            {/* Profile Avatar Circle Button */}
            <div className="relative">
              <button
                onClick={handleOpenProfileModal}
                className="flex items-center gap-2 p-0.5 rounded-full border-2 border-purple-500/60 hover:border-purple-400 transition cursor-pointer shadow-lg shadow-purple-950/40"
                title="View User Details"
              >
                <img
                  src={avatarUrl}
                  alt={username}
                  className="w-8 h-8 rounded-full object-cover"
                />
              </button>
            </div>
          </div>

          {/* MOBILE HEADER ACTIONS (< 768px) */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => setIsMobileSearchOpen(true)}
              className="p-2 text-slate-300 hover:text-white rounded-xl bg-[#0D0D12] border border-slate-800"
              title="Search"
            >
              <Search className="w-4 h-4 text-slate-300" />
            </button>

            {/* Mobile Profile Avatar Circle Button */}
            <button
              onClick={() => setIsProfileModalOpen(true)}
              className="p-0.5 rounded-full border border-purple-500/60 shrink-0"
              title="View User Details"
            >
              <img
                src={avatarUrl}
                alt={username}
                className="w-7 h-7 rounded-full object-cover"
              />
            </button>

            <button
              onClick={() => setIsDrawerOpen(true)}
              className="p-2 text-slate-300 hover:text-white rounded-xl bg-[#0D0D12] border border-slate-800"
              title="Menu"
            >
              <Menu className="w-4 h-4" />
            </button>
          </div>

        </div>
      </nav>

      {/* User Details Pop-up Modal */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />

      {/* Full-Height Mobile Drawer */}
      <MobileDrawer isOpen={isDrawerOpen} onClose={() => setIsDrawerOpen(false)} />

      {/* Full-Screen Mobile Search Modal */}
      <MobileSearchModal isOpen={isMobileSearchOpen} onClose={() => setIsMobileSearchOpen(false)} />
    </>
  );
}
