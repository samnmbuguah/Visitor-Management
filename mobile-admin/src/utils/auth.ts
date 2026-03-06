import { getProfile } from '../api/auth';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'HOST' | 'RECEPTIONIST';

export interface UserProfile {
  user_id: number;
  username: string;
  email: string;
  role: UserRole;
  exp: number;
}

export class AuthSecurity {
  static async verifyAdminRole(): Promise<UserProfile> {
    const profile = await getProfile();
    
    if (profile.role !== 'ADMIN' && profile.role !== 'SUPER_ADMIN') {
      throw new Error(`Access denied. Required: ADMIN or SUPER_ADMIN, Current: ${profile.role}`);
    }
    
    return profile;
  }

  static async verifyHostRole(): Promise<UserProfile> {
    const profile = await getProfile();
    
    if (profile.role !== 'HOST') {
      throw new Error(`Access denied. Required: HOST, Current: ${profile.role}`);
    }
    
    return profile;
  }

  static async verifyReceptionistRole(): Promise<UserProfile> {
    const profile = await getProfile();
    
    if (profile.role !== 'RECEPTIONIST') {
      throw new Error(`Access denied. Required: RECEPTIONIST, Current: ${profile.role}`);
    }
    
    return profile;
  }

  static hasPermission(userRole: UserRole, requiredRole: UserRole): boolean {
    // Super Admin has access to everything
    if (userRole === 'SUPER_ADMIN') return true;
    
    // Exact match
    if (userRole === requiredRole) return true;
    
    // Admin can access admin-level features
    if (requiredRole === 'ADMIN' && userRole === 'ADMIN') return true;
    
    return false;
  }

  static canAccessFeature(userRole: UserRole, feature: string): boolean {
    const permissions = {
      'SUPER_ADMIN': ['dashboard', 'maintenance', 'assets', 'invites', 'users', 'settings', 'reports'],
      'ADMIN': ['dashboard', 'maintenance', 'assets', 'invites', 'reports'],
      'HOST': ['visitors', 'checkin', 'checkout'],
      'RECEPTIONIST': ['checkin', 'checkout', 'search'],
    };

    return permissions[userRole]?.includes(feature) || false;
  }
}
