import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import SearchOverlay from '../common/SearchOverlay';
import { Home, Compass, Flame, Bookmark, User } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const location = useLocation();

  return (
    <div className="min-h-screen bg-[#050507] text-white flex flex-col selection:bg-purple-600 selection:text-white font-sans antialiased">
      {/* Top Navbar */}
      <Navbar onOpenSearch={() => setIsSearchOpen(true)} />

      {/* Body Container: Sidebar + Content */}
      <div className="flex-1 flex w-full max-w-[1600px] mx-auto">
        <Sidebar />
        <main className="flex-1 px-4 sm:px-8 py-6 max-w-full overflow-x-hidden min-h-[calc(100vh-4rem)]">
          {children}
        </main>
      </div>

      {/* Global Search Overlay Modal */}
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-[#0D0D12]/95 backdrop-blur-lg border-t border-slate-800 px-6 py-2 flex items-center justify-between text-xs">
        <Link to="/" className={`flex flex-col items-center gap-1 ${location.pathname === '/' ? 'text-purple-400 font-bold' : 'text-slate-400'}`}>
          <Home className="w-5 h-5" />
          <span>Home</span>
        </Link>
        <Link to="/browse" className={`flex flex-col items-center gap-1 ${location.pathname === '/browse' ? 'text-purple-400 font-bold' : 'text-slate-400'}`}>
          <Compass className="w-5 h-5" />
          <span>Browse</span>
        </Link>
        <Link to="/watchlist" className={`flex flex-col items-center gap-1 ${location.pathname === '/watchlist' ? 'text-purple-400 font-bold' : 'text-slate-400'}`}>
          <Bookmark className="w-5 h-5" />
          <span>Library</span>
        </Link>
        <Link to="/profile" className={`flex flex-col items-center gap-1 ${location.pathname === '/profile' ? 'text-purple-400 font-bold' : 'text-slate-400'}`}>
          <User className="w-5 h-5" />
          <span>Profile</span>
        </Link>
      </div>
    </div>
  );
}
