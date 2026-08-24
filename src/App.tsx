import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import SkeletonLoader from './components/shared/SkeletonLoader';
import ProtectedRoute from './components/shared/ProtectedRoute';

// Public Auth Pages
import LoginPage from './pages/Auth/LoginPage';
import SignupPage from './pages/Auth/SignupPage';

// Code-split pages for max performance
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
            {/* Public Authentication Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />

            {/* Protected Routes */}
            <Route path="/" element={<ProtectedRoute><HomePage /></ProtectedRoute>} />
            <Route path="/browse" element={<ProtectedRoute><BrowsePage /></ProtectedRoute>} />
            <Route path="/anime/:id" element={<ProtectedRoute><DetailsPage /></ProtectedRoute>} />
            <Route path="/watch/:id/:episode" element={<ProtectedRoute><WatchPage /></ProtectedRoute>} />
            <Route path="/watchlist" element={<ProtectedRoute><WatchlistPage /></ProtectedRoute>} />
            <Route path="/schedule" element={<ProtectedRoute><SchedulePage /></ProtectedRoute>} />
            <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
          </Routes>
        </Suspense>
      </MainLayout>
    </BrowserRouter>
  );
}
