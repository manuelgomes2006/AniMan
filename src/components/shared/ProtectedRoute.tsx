import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Tv } from 'lucide-react';
import logoImg from '../../assets/logo.jpg';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export default function ProtectedRoute({ children, requireAuth = true }: ProtectedRouteProps) {
  const { user, session, loading, authLoading } = useAuth();
  const location = useLocation();

  const isAuthenticating = authLoading !== undefined ? authLoading : loading;
  const isAuthenticated = Boolean(user || session);

  if (isAuthenticating) {
    return (
      <div className="min-h-screen bg-[#050507] flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 animate-pulse">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full overflow-hidden border-2 border-purple-500/60 shadow-2xl shadow-purple-950/80 shrink-0 bg-black flex items-center justify-center">
            <img src={logoImg} alt="AniMan Logo" className="w-full h-full object-cover object-center" />
          </div>
          <div className="text-center">
            <span className="font-black text-xl text-white tracking-tight">Ani<span className="text-purple-400">Man</span></span>
            <p className="text-xs text-purple-400 font-semibold mt-1">Authenticating session...</p>
          </div>
        </div>
      </div>
    );
  }

  if (requireAuth && !isAuthenticated) {
    const currentPath = location.pathname + location.search;
    return <Navigate to={`/login?redirect=${encodeURIComponent(currentPath)}`} replace />;
  }

  return <>{children}</>;
}
