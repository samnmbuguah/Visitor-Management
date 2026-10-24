import React from 'react';
import { useQuery, useMutation, useQueryClient, QueryKey } from '@tanstack/react-query';
import { useAppStore } from '@/store';
import { APIService } from '@/services/api';
import { logger } from '@/lib/logger';

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
    logger.error('Mutation error:', error);
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
      const previousQueries: QueryKey[] = [];
      
      if (options?.optimisticUpdate) {
        await queryClient.cancelQueries({ queryKey: options.optimisticUpdate.queryKey });
        previousQueries.push(options.optimisticUpdate.queryKey);
        
        const previousData = queryClient.getQueryData(options.optimisticUpdate.queryKey);
        
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
      
      if (options?.invalidateQueries) {
        options.invalidateQueries.forEach((queryKey) => {
          queryClient.invalidateQueries({ queryKey });
        });
      }
      
      setLastSyncTime(Date.now());
    },
    onError: (error, variables, context) => {
      options?.onError?.(error, variables);
      
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

// Visitor Management Hooks with Enhanced Caching
export function useEnhancedLocations() {
  return useEnhancedQuery(
    ['locations'],
    () => APIService.locations.getLocations(),
    {
      staleTime: 30 * 60 * 1000,
      gcTime: 60 * 60 * 1000,
    }
  );
}

export function useEnhancedVisitors(locationId?: number) {
  return useEnhancedQuery(
    ['visitors', locationId],
    () => APIService.visitors.getVisitors(locationId ? { location: locationId } : {}),
    {
      staleTime: 30 * 1000, // 30 seconds for real-time visitor lists
      refetchOnWindowFocus: true,
    }
  );
}

export function useEnhancedInvites() {
  return useEnhancedQuery(
    ['invites'],
    () => APIService.invites.getInvites(),
    {
      staleTime: 3 * 60 * 1000,
      refetchOnWindowFocus: true,
    }
  );
}

export function useEnhancedHosts(locationId?: number) {
  return useEnhancedQuery(
    ['hosts', locationId],
    () => APIService.hosts.getHosts(locationId),
    {
      staleTime: 15 * 60 * 1000,
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
      queryKeys.map((queryKey) => 
        queryClient.prefetchQuery({ 
          queryKey, 
          staleTime: DEFAULT_QUERY_CONFIG.staleTime 
        })
      )
    );
  };

  const invalidateMultiple = async (queryKeys: QueryKey[]) => {
    await Promise.all(
      queryKeys.map((queryKey) => 
        queryClient.invalidateQueries({ queryKey })
      )
    );
    setLastSyncTime(Date.now());
  };

  const resetMultiple = async (queryKeys: QueryKey[]) => {
    await Promise.all(
      queryKeys.map((queryKey) => 
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
export function useRealTimeSync(interval: number = 30000) {
  const queryClient = useQueryClient();
  const { offlineMode, needsSync } = useAppStore((state) => ({
    offlineMode: state.offlineMode,
    needsSync: !state.lastSyncTime || Date.now() - state.lastSyncTime > interval,
  }));

  React.useEffect(() => {
    if (offlineMode) return;

    const syncInterval = setInterval(() => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey[0] as string;
          return ['visitors', 'invites', 'watchlist', 'analytics'].includes(queryKey);
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
      logger.error('Data validation error:', error);
      return false;
    }
  };

  const sanitizeData = (data: any): any => {
    if (Array.isArray(data)) {
      return data.map((item) => sanitizeData(item));
    }
    if (data && typeof data === 'object') {
      const sanitized: any = {};
      Object.keys(data).forEach((key) => {
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
