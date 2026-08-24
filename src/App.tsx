import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import SkeletonLoader from './components/shared/SkeletonLoader';
import ProtectedRoute from './components/shared/ProtectedRoute';

// Public Auth Pages
import LoginPage from './pages/Auth/LoginPage';
import SignupPage from './pages/Auth/SignupPage';

// Code-split pages for instant loading
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
            {/* Instant Access Public Routes */}
            <Route path="/" element={<HomePage />} />
            <Route path="/browse" element={<BrowsePage />} />
            <Route path="/anime/:id" element={<DetailsPage />} />
            <Route path="/watch/:id/:episode" element={<WatchPage />} />
            <Route path="/schedule" element={<SchedulePage />} />

            {/* Authentication Pages */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* User Personalization Routes */}
            <Route path="/watchlist" element={<ProtectedRoute requireAuth={true}><WatchlistPage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute requireAuth={true}><ProfilePage /></ProtectedRoute>} />
          </Routes>
        </Suspense>
      </MainLayout>
    </BrowserRouter>
  );
}
