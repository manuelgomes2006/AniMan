import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { getUserProfile } from '../../services/userStore';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export default function ProtectedRoute({ children }: ProtectedRouteProps) {
  const location = useLocation();
  const user = getUserProfile();

  if (!user || !user.id) {
    return <Navigate to="/login" state={{ returnTo: location.pathname + location.search }} replace />;
  }

  return <>{children}</>;
}
