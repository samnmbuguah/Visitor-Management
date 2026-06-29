import { create } from 'zustand';
import { devtools, persist } from 'zustand/middleware';
import { UserPayload } from '@/lib/auth';

// Global App State Interface
interface AppState {
  // User and Authentication
  user: UserPayload | null;
  isAuthenticated: boolean;
  selectedLocation: number | null;
  
  // UI State
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';
  
  // Data Caching
  lastSyncTime: number | null;
  offlineMode: boolean;
  
  // Actions
  setUser: (user: UserPayload | null) => void;
  setSelectedLocation: (location: number | null) => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  setLastSyncTime: (time: number | null) => void;
  setOfflineMode: (offline: boolean) => void;
  
  // Computed
  hasPermission: (permission: string) => boolean;
  canAccessFeature: (feature: string) => boolean;
}

// Permission Matrix
const PERMISSION_MATRIX = {
  SUPER_ADMIN: [
    'dashboard.view', 'users.manage', 'locations.manage', 'settings.manage',
    'maintenance.manage', 'assets.manage', 'invites.manage', 'reports.view'
  ],
  ADMIN: [
    'dashboard.view', 'locations.manage', 'maintenance.manage', 
    'assets.manage', 'invites.manage', 'reports.view'
  ],
  HOST: [
    'visitors.view', 'visitors.checkin', 'visitors.checkout', 'notifications.view'
  ],
  RECEPTIONIST: [
    'visitors.checkin', 'visitors.checkout', 'visitors.search'
  ],
  MANAGER: [
    'dashboard.view', 'locations.view', 'leases.view',
    'maintenance.view', 'assets.view', 'reports.view'
  ]
} as const;

// Feature Access Matrix
const FEATURE_ACCESS = {
  SUPER_ADMIN: ['admin', 'maintenance', 'assets', 'invites', 'users', 'settings', 'reports'],
  ADMIN: ['admin', 'maintenance', 'assets', 'invites', 'reports'],
  HOST: ['host', 'visitors', 'notifications'],
  RECEPTIONIST: ['receptionist', 'checkin', 'checkout'],
  MANAGER: ['admin', 'analytics', 'reports', 'leases']
} as const;

// Create the store
export const useAppStore = create<AppState>()(
  devtools(
    persist(
      (set, get) => ({
        // Initial State
        user: null,
        isAuthenticated: false,
        selectedLocation: null,
        sidebarOpen: false,
        theme: 'system',
        lastSyncTime: null,
        offlineMode: false,

        // Actions
        setUser: (user) => set({ 
          user, 
          isAuthenticated: !!user 
        }),

        setSelectedLocation: (location) => set({ selectedLocation: location }),

        setSidebarOpen: (open) => set({ sidebarOpen: open }),

        setTheme: (theme) => set({ theme }),

        setLastSyncTime: (time) => set({ lastSyncTime: time }),

        setOfflineMode: (offline) => set({ offlineMode: offline }),

        // Computed Properties
        hasPermission: (permission) => {
          const { user } = get();
          if (!user) return false;
          return (PERMISSION_MATRIX[user.role as keyof typeof PERMISSION_MATRIX] as readonly string[])?.includes(permission as any) || false;
        },

        canAccessFeature: (feature) => {
          const { user } = get();
          if (!user) return false;
          return (FEATURE_ACCESS[user.role as keyof typeof FEATURE_ACCESS] as readonly string[])?.includes(feature as any) || false;
        },
      }),
      {
        name: 'visitor-management-store',
        partialize: (state) => ({
          selectedLocation: state.selectedLocation,
          theme: state.theme,
          lastSyncTime: state.lastSyncTime,
        }),
      }
    )
  )
);

// Selectors for common use cases
export const useUser = () => useAppStore((state) => state.user);
export const useIsAuthenticated = () => useAppStore((state) => state.isAuthenticated);
export const useSelectedLocation = () => useAppStore((state) => state.selectedLocation);
export const useTheme = () => useAppStore((state) => state.theme);
export const useOfflineMode = () => useAppStore((state) => state.offlineMode);

// Permission hooks
export const usePermissions = () => {
  const hasPermission = useAppStore((state) => state.hasPermission);
  const canAccessFeature = useAppStore((state) => state.canAccessFeature);
  const user = useUser();

  return {
    hasPermission,
    canAccessFeature,
    isSuperAdmin: user?.role === 'SUPER_ADMIN',
    isAdmin: user?.role === 'ADMIN',
    isHost: user?.role === 'HOST',
    isReceptionist: user?.role === 'RECEPTIONIST',
    user,
  };
};

// Location management
export const useLocationManagement = () => {
  const selectedLocation = useSelectedLocation();
  const setSelectedLocation = useAppStore((state) => state.setSelectedLocation);
  
  return {
    selectedLocation,
    setSelectedLocation,
    clearLocation: () => setSelectedLocation(null),
  };
};

// Theme management
export const useThemeManagement = () => {
  const theme = useTheme();
  const setTheme = useAppStore((state) => state.setTheme);
  
  return {
    theme,
    setTheme,
    isDark: theme === 'dark',
    isLight: theme === 'light',
    isSystem: theme === 'system',
  };
};

// Offline/Sync management
export const useSyncManagement = () => {
  const lastSyncTime = useAppStore((state) => state.lastSyncTime);
  const offlineMode = useAppStore((state) => state.offlineMode);
  const setLastSyncTime = useAppStore((state) => state.setLastSyncTime);
  const setOfflineMode = useAppStore((state) => state.setOfflineMode);
  
  return {
    lastSyncTime,
    offlineMode,
    setLastSyncTime,
    setOfflineMode,
    needsSync: !lastSyncTime || Date.now() - lastSyncTime > 5 * 60 * 1000, // 5 minutes
  };
};
