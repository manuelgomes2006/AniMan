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
    <div className="fixed inset-0 w-full h-full h-[100dvh] bg-[#050507] text-white flex flex-col overflow-hidden selection:bg-purple-600 selection:text-white font-sans antialiased">
      {/* Navbar (Desktop + Mobile Header) */}
      <div className="shrink-0 z-40">
        <Navbar onOpenSearch={() => setIsSearchOpen(true)} />
      </div>

      {/* Body Container: Sidebar + Main Content */}
      <div className="flex-1 flex w-full max-w-[1600px] mx-auto overflow-hidden relative">
        <Sidebar />
        <main className="flex-1 px-4 sm:px-8 py-4 sm:py-6 max-w-full overflow-y-auto overflow-x-hidden min-h-0 pb-8 md:pb-6 scrollbar-none">
          {children}
        </main>
      </div>

      {/* Global Search Modal */}
      <SearchOverlay isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Mobile Bottom Navigation Bar - Fixed to Flex Layout Bottom */}
      <div className="shrink-0 z-50 md:hidden w-full">
        <MobileBottomNav />
      </div>
    </div>
  );
}
