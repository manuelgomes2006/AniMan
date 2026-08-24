import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, Flame, Bookmark, History, User, Settings, Moon } from 'lucide-react';

export default function Sidebar() {
  const location = useLocation();

  const navItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Explore', path: '/browse', icon: Compass },
    { label: 'Trending', path: '/browse?sort=TRENDING_DESC', icon: Flame },
    { label: 'My List', path: '/watchlist', icon: Bookmark },
    { label: 'History', path: '/watchlist?tab=history', icon: History },
    { label: 'Profile', path: '/profile', icon: User },
  ];

  return (
    <aside className="hidden md:flex flex-col items-center justify-between w-20 bg-[#050507] border-r border-slate-900/80 py-6 sticky top-16 h-[calc(100vh-4rem)] z-40 shrink-0">
      {/* Top Navigation Icons */}
      <div className="flex flex-col items-center gap-4 w-full px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex flex-col items-center justify-center w-14 h-14 rounded-2xl transition-all duration-200 group relative ${
                isActive
                  ? 'bg-purple-600/20 text-purple-400 border border-purple-500/40 shadow-lg shadow-purple-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-[#0D0D12]'
              }`}
              title={item.label}
            >
              <Icon className={`w-5 h-5 transition-transform group-hover:scale-110 ${isActive ? 'text-purple-400' : ''}`} />
              <span className="text-[10px] font-semibold mt-1 opacity-80">{item.label}</span>
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-purple-500 rounded-r-full shadow-glow" />
              )}
            </Link>
          );
        })}
      </div>

      {/* Bottom Settings & Theme Action */}
      <div className="flex flex-col items-center gap-3">
        <button
          className="w-12 h-12 rounded-2xl bg-[#0D0D12] text-slate-400 hover:text-white border border-slate-800 flex items-center justify-center transition hover:border-purple-500/40"
          title="Toggle Dark Theme"
        >
          <Moon className="w-5 h-5" />
        </button>
      </div>
    </aside>
  );
}
