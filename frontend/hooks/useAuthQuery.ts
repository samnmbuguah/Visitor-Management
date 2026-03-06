import { useQuery, useMutation, useQueryClient, QueryKey } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import { useRouter } from 'next/navigation';

// Reusable hook for authenticated API calls
export function useAuthenticatedQuery<T>(
  queryKey: QueryKey,
  queryFn: () => Promise<T>,
  options?: {
    enabled?: boolean;
    onSuccess?: (data: T) => void;
    onError?: (error: any) => void;
  }
) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  return useQuery({
    queryKey,
    queryFn,
    enabled: !!user && (options?.enabled !== false),
    ...options,
  });
}

// Reusable hook for authenticated mutations
export function useAuthenticatedMutation<T, V>(
  mutationFn: (variables: V) => Promise<T>,
  options?: {
    onSuccess?: (data: T) => void;
    onError?: (error: any) => void;
    onSettled?: () => void;
  }
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: (data) => {
      options?.onSuccess?.(data);
    },
    onError: (error) => {
      options?.onError?.(error);
    },
    onSettled: () => {
      options?.onSettled?.();
    },
  });
}

// Hook for protected pages
export function useProtectedPage(requiredRole?: string) {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const isAuthenticated = !!user && !authLoading;
  const hasRequiredRole = !requiredRole || user?.role === requiredRole || user?.role === 'SUPER_ADMIN';

  const redirect = () => {
    if (!authLoading && (!user || !hasRequiredRole)) {
      router.push('/login');
    }
  };

  return {
    user,
    loading: authLoading,
    isAuthenticated,
    hasRequiredRole,
    redirect,
    isLoading: authLoading
  };
}

// Hook for admin-only pages
export function useAdminPage() {
  return useProtectedPage('ADMIN');
}

// Hook for super-admin-only pages
export function useSuperAdminPage() {
  return useProtectedPage('SUPER_ADMIN');
}

export function useHostPage() {
  return useProtectedPage('HOST');
}

export function useReceptionistPage() {
  return useProtectedPage('RECEPTIONIST');
}
