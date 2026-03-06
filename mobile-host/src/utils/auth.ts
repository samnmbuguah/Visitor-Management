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
  static async verifyHostRole(): Promise<UserProfile> {
    const profile = await getProfile();
    
    if (profile.role !== 'HOST') {
      throw new Error(`Access denied. Required: HOST, Current: ${profile.role}`);
    }
    
    return profile;
  }

  static canAccessFeature(userRole: UserRole, feature: string): boolean {
    const permissions = {
      'SUPER_ADMIN': ['dashboard', 'maintenance', 'assets', 'invites', 'users', 'settings', 'reports'],
      'ADMIN': ['dashboard', 'maintenance', 'assets', 'invites', 'reports'],
      'HOST': ['visitors', 'checkin', 'checkout', 'notifications'],
      'RECEPTIONIST': ['checkin', 'checkout', 'search'],
    };

    return permissions[userRole]?.includes(feature) || false;
  }
}
