import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, Calendar, Bookmark, User } from 'lucide-react';

export default function MobileBottomNav() {
  const location = useLocation();

  const navItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Browse', path: '/browse', icon: Compass },
    { label: 'Schedule', path: '/schedule', icon: Calendar },
    { label: 'Watchlist', path: '/watchlist', icon: Bookmark },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 6px)' }}
      className="md:hidden fixed bottom-0 left-0 right-0 z-[9999] w-full bg-[#0D0D12]/95 backdrop-blur-2xl border-t border-slate-800/80 px-2 pt-2 flex items-center justify-around shadow-2xl pointer-events-auto transform-none"
    >
      {navItems.map((item) => {
        const Icon = item.icon;
        const isActive =
          location.pathname === item.path ||
          (item.path !== '/' && location.pathname.startsWith(item.path));

        return (
          <Link
            key={item.label}
            to={item.path}
            className={`flex flex-col items-center gap-1 transition-all duration-150 py-1 px-3 rounded-xl cursor-pointer ${
              isActive ? 'text-purple-400 font-black scale-105' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-purple-400 fill-purple-400/20' : ''}`} />
            <span className="text-[10px] font-bold tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
