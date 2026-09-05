import React, { Suspense, lazy, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import SkeletonLoader from './components/shared/SkeletonLoader';
import ProtectedRoute from './components/shared/ProtectedRoute';
import ErrorBoundary from './components/shared/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';

// Lazy-load ALL public auth pages for minimum initial bundle footprint
const LoginPage = lazy(() => import('./pages/Auth/LoginPage'));
const SignupPage = lazy(() => import('./pages/Auth/SignupPage'));
const ForgotPasswordPage = lazy(() => import('./pages/Auth/ForgotPasswordPage'));
const ResetPasswordPage = lazy(() => import('./pages/Auth/ResetPasswordPage'));
const DebugPlayerPage = lazy(() => import('./pages/DebugPlayerPage'));

// Lazy-load ALL main application routes
const HomePage = lazy(() => import('./pages/HomePage'));
const BrowsePage = lazy(() => import('./pages/BrowsePage'));
const DetailsPage = lazy(() => import('./pages/DetailsPage'));
const WatchPage = lazy(() => import('./pages/WatchPage'));
const WatchlistPage = lazy(() => import('./pages/WatchlistPage'));
const SchedulePage = lazy(() => import('./pages/SchedulePage'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    const mainEl = document.querySelector('main');
    if (mainEl) mainEl.scrollTop = 0;
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <BrowserRouter>
          <ScrollToTop />
          <MainLayout>
            <Suspense fallback={
              <div className="max-w-7xl mx-auto py-6 space-y-6">
                <SkeletonLoader type="hero" />
                <SkeletonLoader type="card" count={6} />
              </div>
            }>
              <Routes>
                {/* Core Public Application Routes (Instant Access for Guests & Members) */}
                <Route path="/" element={<HomePage />} />
                <Route path="/browse" element={<BrowsePage />} />
                <Route path="/anime/:id" element={<DetailsPage />} />
                <Route path="/watch/:id/:episode" element={<WatchPage />} />
                <Route path="/schedule" element={<SchedulePage />} />

                {/* Public Authentication Pages */}
                <Route path="/login" element={<LoginPage />} />
                <Route path="/signup" element={<SignupPage />} />
                <Route path="/forgot-password" element={<ForgotPasswordPage />} />
                <Route path="/reset-password" element={<ResetPasswordPage />} />
                <Route path="/debug-player" element={<DebugPlayerPage />} />

                {/* Authenticated User Routes */}
                <Route path="/watchlist" element={<ProtectedRoute><WatchlistPage /></ProtectedRoute>} />
                <Route path="/history" element={<ProtectedRoute><WatchlistPage /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
              </Routes>
            </Suspense>
          </MainLayout>
        </BrowserRouter>
      </AuthProvider>
    </ErrorBoundary>
  );
}
