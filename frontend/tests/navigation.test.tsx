import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Navigation from '@/components/Navigation';
import { AuthProvider } from '@/context/AuthContext';

// Mock the auth context
const mockAuthContext = {
  user: null,
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
    render(
      <AuthProvider>
        <Navigation />
      </AuthProvider>
    );
    
    // Navigation should not render when user is null
    expect(screen.queryByText('Dashboard')).toBeNull();
    expect(screen.queryByText('Maintenance')).toBeNull();
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

    // Should show admin-only items
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Maintenance')).toBeInTheDocument();
    expect(screen.getByText('Assets')).toBeInTheDocument();
    expect(screen.getByText('Tenants')).toBeInTheDocument();
    expect(screen.getByText('Leases')).toBeInTheDocument();
    
    // Should not show host-only items
    expect(screen.queryByText('Property Manager')).toBeNull();
  });

  it('should render admin navigation for ADMIN user', () => {
    mockAuthContext.user = {
      user_id: 2,
      username: 'admin',
      email: 'admin@test.com',
      role: 'ADMIN',
      exp: Date.now() / 1000 + 3600,
    };

    render(
      <AuthProvider>
        <Navigation />
      </AuthProvider>
    );

    // Should show admin items
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Maintenance')).toBeInTheDocument();
    expect(screen.getByText('Assets')).toBeInTheDocument();
    
    // Should not show super admin-only items
    expect(screen.queryByText('Tenants')).toBeNull();
    expect(screen.queryByText('Leases')).toBeNull();
    expect(screen.queryByText('User Management')).toBeNull();
  });

  it('should render host navigation for HOST user', () => {
    mockAuthContext.user = {
      user_id: 3,
      username: 'host',
      email: 'host@test.com',
      role: 'HOST',
      exp: Date.now() / 1000 + 3600,
    };

    render(
      <AuthProvider>
        <Navigation />
      </AuthProvider>
    );

    // Should show host items
    expect(screen.getByText('Property Manager')).toBeInTheDocument();
    
    // Should not show admin items
    expect(screen.queryByText('Dashboard')).toBeNull();
    expect(screen.queryByText('Maintenance')).toBeNull();
    expect(screen.queryByText('Assets')).toBeNull();
    expect(screen.queryByText('Tenants')).toBeNull();
    expect(screen.queryByText('Leases')).toBeNull();
  });

  it('should render receptionist navigation for RECEPTIONIST user', () => {
    mockAuthContext.user = {
      user_id: 4,
      username: 'receptionist',
      email: 'receptionist@test.com',
      role: 'RECEPTIONIST',
      exp: Date.now() / 1000 + 3600,
    };

    render(
      <AuthProvider>
        <Navigation />
      </AuthProvider>
    );

    // Should show receptionist items
    expect(screen.getByText('Receptionist')).toBeInTheDocument();
    
    // Should not show admin or host items
    expect(screen.queryByText('Dashboard')).toBeNull();
    expect(screen.queryByText('Maintenance')).toBeNull();
    expect(screen.queryByText('Assets')).toBeNull();
    expect(screen.queryByText('Property Manager')).toBeNull();
  });

  it('should display user role in UI', () => {
    mockAuthContext.user = {
      user_id: 1,
      username: 'testuser',
      email: 'test@test.com',
      role: 'ADMIN',
      exp: Date.now() / 1000 + 3600,
    };

    render(
      <AuthProvider>
        <Navigation />
      </AuthProvider>
    );

    // Should display user role
    expect(screen.getByText('ADMIN')).toBeInTheDocument();
  });

  it('should handle logout correctly', () => {
    const mockLogout = vi.fn();
    mockAuthContext.logout = mockLogout;
    mockAuthContext.user = {
      user_id: 1,
      username: 'testuser',
      email: 'test@test.com',
      role: 'ADMIN',
      exp: Date.now() / 1000 + 3600,
    };

    render(
      <AuthProvider>
        <Navigation />
      </AuthProvider>
    );

    // Find and click logout button
    const logoutButton = screen.getByRole('button', { name: /logout/i });
    fireEvent.click(logoutButton);
    
    expect(mockLogout).toHaveBeenCalled();
  });

  it('should show Property Management branding', () => {
    mockAuthContext.user = {
      user_id: 1,
      username: 'testuser',
      email: 'test@test.com',
      role: 'ADMIN',
      exp: Date.now() / 1000 + 3600,
    };

    render(
      <AuthProvider>
        <Navigation />
      </AuthProvider>
    );

    // Should show updated branding
    expect(screen.getByText('Property Management')).toBeInTheDocument();
    expect(screen.getByText('PM')).toBeInTheDocument();
  });
});
