import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getUserProfile } from '../../services/userStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

export default function ProtectedRoute({ children, requireAuth = false }: ProtectedRouteProps) {
  const location = useLocation();
  const user = getUserProfile();

  // If auth is strictly required and user has no ID, redirect to login
  if (requireAuth && (!user || !user.id)) {
    return <Navigate to="/login" state={{ returnTo: location.pathname + location.search }} replace />;
  }

  return <>{children}</>;
}
