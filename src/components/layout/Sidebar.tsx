import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, Flame, Bookmark, History, User } from 'lucide-react';

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
    <aside className="hidden md:flex flex-col items-center justify-between w-16 bg-[#050507] border-r border-slate-900/80 py-4 sticky top-16 h-[calc(100vh-4rem)] z-40 shrink-0">
      {/* Top Navigation Icons */}
      <div className="flex flex-col items-center gap-3 w-full px-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex flex-col items-center justify-center w-11 h-11 rounded-xl transition-all duration-200 group relative ${
                isActive
                  ? 'bg-purple-600/20 text-purple-400 border border-purple-500/40 shadow-md shadow-purple-950/40 font-bold'
                  : 'text-slate-400 hover:text-white hover:bg-[#0D0D12]'
              }`}
              title={item.label}
            >
              <Icon className={`w-4 h-4 transition-transform group-hover:scale-105 ${isActive ? 'text-purple-400' : ''}`} />
              <span className="text-[9px] font-semibold mt-0.5 opacity-80 line-clamp-1">{item.label}</span>
              {isActive && (
                <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-purple-500 rounded-r-full shadow-glow" />
              )}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
