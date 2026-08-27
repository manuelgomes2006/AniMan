import React, { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import MobileBottomNav from './MobileBottomNav';
import SearchOverlay from '../common/SearchOverlay';

interface MainLayoutProps {
  children: React.ReactNode;
}

export default function MainLayout({ children }: MainLayoutProps) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#050507] text-white flex flex-col selection:bg-purple-600 selection:text-white font-sans antialiased">
      {/* Navbar (Desktop + Mobile Header) */}
      <Navbar onOpenSearch={() => setIsSearchOpen(true)} />

      {/* Body Container: Sidebar + Main Content */}
      <div className="flex-1 flex w-full max-w-[1600px] mx-auto">
        <Sidebar />
        <main className="flex-1 px-4 sm:px-8 py-4 sm:py-6 max-w-full overflow-x-hidden min-h-[calc(100vh-4rem)] pb-32 md:pb-6">
          {children}
        </main>
      </div>

      {/* Global Search Modal */}
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Mobile Fixed Glassmorphism Bottom Navigation */}
      <MobileBottomNav />
    </div>
  );
}
