import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import SkeletonLoader from './components/shared/SkeletonLoader';

// Code-split pages for faster initial load & smooth route transitions
const HomePage = lazy(() => import('./pages/HomePage'));
const BrowsePage = lazy(() => import('./pages/BrowsePage'));
const DetailsPage = lazy(() => import('./pages/DetailsPage'));
const WatchPage = lazy(() => import('./pages/WatchPage'));
const WatchlistPage = lazy(() => import('./pages/WatchlistPage'));
const SchedulePage = lazy(() => import('./pages/SchedulePage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

export default function App() {
  return (
    <BrowserRouter>
      <MainLayout>
        <Suspense fallback={
          <div className="max-w-7xl mx-auto py-6 space-y-6">
            <SkeletonLoader type="hero" />
            <SkeletonLoader type="card" count={6} />
          </div>
        }>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/browse" element={<BrowsePage />} />
            <Route path="/anime/:id" element={<DetailsPage />} />
            <Route path="/watch/:id/:episode" element={<WatchPage />} />
            <Route path="/watchlist" element={<WatchlistPage />} />
            <Route path="/schedule" element={<SchedulePage />} />
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </Suspense>
      </MainLayout>
    </BrowserRouter>
  );
}
