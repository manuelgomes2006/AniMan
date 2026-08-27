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
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#0D0D12]/95 backdrop-blur-xl border-t border-slate-800/90 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] flex items-center justify-around shadow-[0_-10px_25px_rgba(0,0,0,0.85)] select-none touch-manipulation"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
      }}
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
            className={`flex flex-col items-center gap-1 transition-colors duration-150 py-1 px-3 rounded-xl touch-manipulation ${
              isActive
                ? 'text-purple-400 font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-purple-400' : 'text-slate-400'}`} />
            <span className="text-[10px] font-semibold tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
