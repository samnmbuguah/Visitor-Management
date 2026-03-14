'use client';

import React, { ReactNode } from 'react';
import { useProtectedPage } from '@/hooks/useAuthQuery';

interface ProtectedPageProps {
  children: ReactNode;
  requiredRole?: string;
  fallback?: ReactNode;
}

export function ProtectedPage({ children, requiredRole, fallback }: ProtectedPageProps) {
  const { loading, isAuthenticated, hasRequiredRole, redirect } = useProtectedPage(requiredRole);

  // Handle redirect
  React.useEffect(() => {
    redirect();
  }, [redirect]);

  // Show loading state
  if (loading) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show unauthorized state
  if (!isAuthenticated || !hasRequiredRole) {
    return fallback || (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-muted-foreground">Unauthorized</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

interface AdminPageProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function AdminPage({ children, fallback }: AdminPageProps) {
  return (
    <ProtectedPage requiredRole="ADMIN" fallback={fallback}>
      {children}
    </ProtectedPage>
  );
}

interface SuperAdminPageProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function SuperAdminPage({ children, fallback }: SuperAdminPageProps) {
  return (
    <ProtectedPage requiredRole="SUPER_ADMIN" fallback={fallback}>
      {children}
    </ProtectedPage>
  );
}

interface HostPageProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function HostPage({ children, fallback }: HostPageProps) {
  return (
    <ProtectedPage requiredRole="HOST" fallback={fallback}>
      {children}
    </ProtectedPage>
  );
}

interface ReceptionistPageProps {
  children: ReactNode;
  fallback?: ReactNode;
}

export function ReceptionistPage({ children, fallback }: ReceptionistPageProps) {
  return (
    <ProtectedPage requiredRole="RECEPTIONIST" fallback={fallback}>
      {children}
    </ProtectedPage>
  );
}
