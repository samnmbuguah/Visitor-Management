import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Navigation from '@/components/Navigation';
import { AuthProvider } from '@/context/AuthContext';

const mockAuthContext = {
  user: null as any,
  loading: false,
  login: vi.fn(),
  logout: vi.fn(),
};

vi.mock('@/context/AuthContext', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe('Navigation Component', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not render when user is not authenticated', () => {
    mockAuthContext.user = null;
    render(
      <AuthProvider>
        <Navigation />
      </AuthProvider>
    );
    expect(screen.queryByText('Dashboard')).toBeNull();
  });

  it('should render admin navigation for SUPER_ADMIN user', () => {
    mockAuthContext.user = {
      user_id: 1,
      username: 'superadmin',
      email: 'super@admin.com',
      role: 'SUPER_ADMIN',
      exp: Date.now() / 1000 + 3600,
    };

    render(
      <AuthProvider>
        <Navigation />
      </AuthProvider>
    );

    // Should show visitor management items
    expect(screen.getAllByText('Dashboard').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Invites').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Watchlist').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Locations').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tenants').length).toBeGreaterThan(0);
    
    // Should NOT show obsolete property management items
    expect(screen.queryByText('Maintenance')).toBeNull();
    expect(screen.queryByText('Assets')).toBeNull();
    expect(screen.queryByText('Leases')).toBeNull();
    expect(screen.queryByText('Property Manager')).toBeNull();
  });

  it('should render host navigation for HOST user', () => {
    mockAuthContext.user = {
      user_id: 2,
      username: 'hostuser',
      email: 'host@company.com',
      role: 'HOST',
      exp: Date.now() / 1000 + 3600,
    };

    render(
      <AuthProvider>
        <Navigation />
      </AuthProvider>
    );

    expect(screen.getAllByText('Host Portal').length).toBeGreaterThan(0);
    expect(screen.queryByText('Locations')).toBeNull();
  });
});
