import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import type { AppRole } from '../types/app';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRole: AppRole;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, allowedRole }) => {
  const { user, profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
          <p className="text-sm text-muted-foreground">Loading GateVortx...</p>
        </div>
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace />;
  if (profile && profile.role !== allowedRole) {
    const roleRoutes: Record<AppRole, string> = {
      admin: '/admin',
      guard: '/guard',
      employee: '/employee',
      teacher: '/teacher',
    };
    return <Navigate to={roleRoutes[profile.role]} replace />;
  }

  // If admin has no company set up yet, redirect to company setup (except if already there)
  if (
    profile?.role === 'admin' &&
    allowedRole === 'admin' &&
    !profile.company_name &&
    typeof window !== 'undefined' &&
    !window.location.pathname.includes('/company-setup')
  ) {
    return <Navigate to="/admin/company-setup" replace />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
