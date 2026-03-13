import React from 'react';
import { useQuery, useMutation, useQueryClient, QueryKey } from '@tanstack/react-query';
import { useAppStore } from '@/store';
import { APIService } from '@/services/api';

// Enhanced query configuration with better caching
const DEFAULT_QUERY_CONFIG = {
  staleTime: 5 * 60 * 1000, // 5 minutes
  gcTime: 10 * 60 * 1000, // 10 minutes
  retry: 3,
  retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
};

// Enhanced mutation configuration
const DEFAULT_MUTATION_CONFIG = {
  retry: 1,
  onError: (error: any) => {
    console.error('Mutation error:', error);
  },
};

// Enhanced authenticated query with offline support
export function useEnhancedQuery<T>(
  queryKey: QueryKey,
  queryFn: () => Promise<T>,
  options?: {
    enabled?: boolean;
    staleTime?: number;
    gcTime?: number;
    onSuccess?: (data: T) => void;
    onError?: (error: any) => void;
    refetchOnWindowFocus?: boolean;
  }
) {
  const offlineMode = useAppStore((state) => state.offlineMode);
  const lastSyncTime = useAppStore((state) => state.lastSyncTime);

  return useQuery({
    queryKey,
    queryFn,
    enabled: !offlineMode && (options?.enabled !== false),
    staleTime: options?.staleTime || DEFAULT_QUERY_CONFIG.staleTime,
    gcTime: options?.gcTime || DEFAULT_QUERY_CONFIG.gcTime,
    retry: offlineMode ? false : DEFAULT_QUERY_CONFIG.retry,
    retryDelay: DEFAULT_QUERY_CONFIG.retryDelay,
    refetchOnWindowFocus: options?.refetchOnWindowFocus ?? !offlineMode,
  });
}

// Enhanced mutation with optimistic updates
export function useEnhancedMutation<T, V>(
  mutationFn: (variables: V) => Promise<T>,
  options?: {
    onSuccess?: (data: T, variables: V) => void;
    onError?: (error: any, variables: V) => void;
    onMutate?: (variables: V) => Promise<unknown> | void;
    onSettled?: () => void;
    invalidateQueries?: QueryKey[];
    optimisticUpdate?: {
      queryKey: QueryKey;
      updateFn: (oldData: any, variables: V) => any;
    };
  }
) {
  const queryClient = useQueryClient();
  const setLastSyncTime = useAppStore((state) => state.setLastSyncTime);

  return useMutation({
    mutationFn,
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      const previousQueries: QueryKey[] = [];
      
      if (options?.optimisticUpdate) {
        await queryClient.cancelQueries({ queryKey: options.optimisticUpdate.queryKey });
        previousQueries.push(options.optimisticUpdate.queryKey);
        
        // Snapshot the previous value
        const previousData = queryClient.getQueryData(options.optimisticUpdate.queryKey);
        
        // Optimistically update to the new value
        queryClient.setQueryData(
          options.optimisticUpdate.queryKey,
          (old: any) => options.optimisticUpdate!.updateFn(old, variables)
        );
        
        return { previousData, previousQueries };
      }
      
      return options?.onMutate?.(variables);
    },
    onSuccess: (data, variables, context) => {
      options?.onSuccess?.(data, variables);
      
      // Invalidate related queries
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }
      
      // Update sync time
      setLastSyncTime(Date.now());
    },
    onError: (error, variables, context) => {
      options?.onError?.(error, variables);
      
      // Rollback optimistic update
      if (context && typeof context === 'object' && 'previousData' in context) {
        const { previousData, previousQueries } = context as any;
        previousQueries.forEach((queryKey: QueryKey) => {
          queryClient.setQueryData(queryKey, previousData);
        });
      }
    },
    onSettled: () => {
      options?.onSettled?.();
    },
  });
}

// Property Management Hooks with Enhanced Caching
export function useEnhancedMaintenanceRequests(locationId?: number) {
  return useEnhancedQuery(
    ['maintenance-requests', locationId],
    () => APIService.propertyManagement.getMaintenanceRequests(locationId),
    {
      staleTime: 2 * 60 * 1000, // 2 minutes for real-time data
      refetchOnWindowFocus: true,
    }
  );
}

export function useEnhancedMaintenanceCategories() {
  return useEnhancedQuery(
    ['maintenance-categories'],
    () => APIService.propertyManagement.getMaintenanceCategories(),
    {
      staleTime: 30 * 60 * 1000, // 30 minutes - categories rarely change
      gcTime: 60 * 60 * 1000, // 1 hour cache
    }
  );
}

export function useEnhancedAssets(locationId?: number) {
  return useEnhancedQuery(
    ['assets', locationId],
    () => APIService.propertyManagement.getAssets(locationId),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      refetchOnWindowFocus: false,
    }
  );
}

export function useEnhancedLocations() {
  return useEnhancedQuery(
    ['locations'],
    () => APIService.visitors.getLocations(),
    {
      staleTime: 30 * 60 * 1000, // 30 minutes - locations change rarely
      gcTime: 60 * 60 * 1000, // 1 hour cache
    }
  );
}

// Enhanced mutation hooks
export function useEnhancedCreateMaintenanceRequest() {
  return useEnhancedMutation(
    APIService.propertyManagement.createMaintenanceRequest,
    {
      onSuccess: () => {
        console.log('Maintenance request created successfully');
      },
      invalidateQueries: [['maintenance-requests']],
      optimisticUpdate: {
        queryKey: ['maintenance-requests'],
        updateFn: (oldData: any, variables) => {
          return oldData ? [...oldData, { ...variables, id: Date.now(), status: 'PENDING' }] : [variables];
        },
      },
    }
  );
}

export function useEnhancedUpdateMaintenanceRequestStatus() {
  return useEnhancedMutation(
    ({ id, status }: { id: number; status: string }) => 
      APIService.propertyManagement.updateMaintenanceRequestStatus(id, status),
    {
      onSuccess: () => {
        console.log('Maintenance request status updated successfully');
      },
      invalidateQueries: [['maintenance-requests']],
      optimisticUpdate: {
        queryKey: ['maintenance-requests'],
        updateFn: (oldData: any, variables) => {
          if (!Array.isArray(oldData)) return oldData;
          return oldData.map((item: any) => 
            item.id === variables.id ? { ...item, status: variables.status } : item
          );
        },
      },
    }
  );
}

export function useEnhancedCreateAsset() {
  return useEnhancedMutation(
    APIService.propertyManagement.createAsset,
    {
      onSuccess: () => {
        console.log('Asset created successfully');
      },
      invalidateQueries: [['assets']],
      optimisticUpdate: {
        queryKey: ['assets'],
        updateFn: (oldData: any, variables) => {
          return oldData ? [...oldData, { ...variables, id: Date.now, status: 'ACTIVE' }] : [variables];
        },
      },
    }
  );
}

// Visitors Hooks with Enhanced Caching
export function useEnhancedInvites() {
  return useEnhancedQuery(
    ['invites'],
    () => APIService.visitors.getInvites(),
    {
      staleTime: 3 * 60 * 1000, // 3 minutes
      refetchOnWindowFocus: true,
    }
  );
}

export function useEnhancedHosts(locationId?: number) {
  return useEnhancedQuery(
    ['hosts', locationId],
    () => APIService.visitors.getHosts(locationId),
    {
      staleTime: 15 * 60 * 1000, // 15 minutes
      gcTime: 30 * 60 * 1000,
    }
  );
}

// Batch operations for better performance
export function useBatchOperations() {
  const queryClient = useQueryClient();
  const setLastSyncTime = useAppStore((state) => state.setLastSyncTime);

  const prefetchMultiple = async (queryKeys: QueryKey[]) => {
    await Promise.all(
      queryKeys.map(queryKey => 
        queryClient.prefetchQuery({ 
          queryKey, 
          staleTime: DEFAULT_QUERY_CONFIG.staleTime 
        })
      )
    );
  };

  const invalidateMultiple = async (queryKeys: QueryKey[]) => {
    await Promise.all(
      queryKeys.map(queryKey => 
        queryClient.invalidateQueries({ queryKey })
      )
    );
    setLastSyncTime(Date.now());
  };

  const resetMultiple = async (queryKeys: QueryKey[]) => {
    await Promise.all(
      queryKeys.map(queryKey => 
        queryClient.resetQueries({ queryKey })
      )
    );
  };

  return {
    prefetchMultiple,
    invalidateMultiple,
    resetMultiple,
  };
}

// Real-time data synchronization
export function useRealTimeSync(interval: number = 30000) { // 30 seconds
  const queryClient = useQueryClient();
  const { offlineMode, needsSync } = useAppStore((state) => ({
    offlineMode: state.offlineMode,
    needsSync: !state.lastSyncTime || Date.now() - state.lastSyncTime > interval,
  }));

  React.useEffect(() => {
    if (offlineMode) return;

    const syncInterval = setInterval(() => {
      // Refetch active queries that need fresh data
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey[0] as string;
          return ['maintenance-requests', 'visitors', 'invites'].includes(queryKey);
        },
      });
    }, interval);

    return () => clearInterval(syncInterval);
  }, [queryClient, offlineMode, interval]);

  return { offlineMode, needsSync };
}

// Data validation and error handling
export function useDataValidation() {
  const validateData = (data: any, schema: any): boolean => {
    try {
      schema.parse(data);
      return true;
    } catch (error) {
      console.error('Data validation error:', error);
      return false;
    }
  };

  const sanitizeData = (data: any): any => {
    if (Array.isArray(data)) {
      return data.map(item => sanitizeData(item));
    }
    if (data && typeof data === 'object') {
      const sanitized: any = {};
      Object.keys(data).forEach(key => {
        if (data[key] !== null && data[key] !== undefined) {
          sanitized[key] = sanitizeData(data[key]);
        }
      });
      return sanitized;
    }
    return data;
  };

  return { validateData, sanitizeData };
}
