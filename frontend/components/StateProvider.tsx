'use client';

import React, { createContext, useContext, useEffect, ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useAppStore } from '@/store';

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      retry: 3,
      retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 1,
    },
  },
});

interface StateProviderProps {
  children: ReactNode;
}

const StateContext = createContext<{
  queryClient: QueryClient;
}>({
  queryClient,
});

export function StateProvider({ children }: StateProviderProps) {
  const { setLastSyncTime, offlineMode } = useAppStore();

  useEffect(() => {
    // Handle online/offline events
    const handleOnline = () => {
      console.log('App is online');
      // Refetch all active queries when coming back online
      queryClient.refetchQueries({
        predicate: (query) => {
          const state = queryClient.getQueryState(query.queryKey);
          return state?.status === 'error';
        },
      });
    };

    const handleOffline = () => {
      console.log('App is offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [queryClient]);

  useEffect(() => {
    // Periodic sync check
    const syncInterval = setInterval(() => {
      if (!offlineMode) {
        setLastSyncTime(Date.now());
      }
    }, 5 * 60 * 1000); // 5 minutes

    return () => clearInterval(syncInterval);
  }, [offlineMode, setLastSyncTime]);

  return (
    <StateContext.Provider value={{ queryClient }}>
      <QueryClientProvider client={queryClient}>
        {children}
        {process.env.NODE_ENV === 'development' && (
          <ReactQueryDevtools initialIsOpen={false} />
        )}
      </QueryClientProvider>
    </StateContext.Provider>
  );
}

export function useStateProvider() {
  const context = useContext(StateContext);
  if (!context) {
    throw new Error('useStateProvider must be used within a StateProvider');
  }
  return context;
}

// Hook for accessing query client
export function useQueryClient() {
  const { queryClient } = useStateProvider();
  return queryClient;
}

// Enhanced hooks with state management integration
export function useAppState() {
  const {
    user,
    isAuthenticated,
    selectedLocation,
    sidebarOpen,
    theme,
    offlineMode,
    lastSyncTime,
    setUser,
    setSelectedLocation,
    setSidebarOpen,
    setTheme,
    setOfflineMode,
    hasPermission,
    canAccessFeature,
  } = useAppStore();

  return {
    // State
    user,
    isAuthenticated,
    selectedLocation,
    sidebarOpen,
    theme,
    offlineMode,
    lastSyncTime,
    
    // Actions
    setUser,
    setSelectedLocation,
    setSidebarOpen,
    setTheme,
    setOfflineMode,
    
    // Computed
    hasPermission,
    canAccessFeature,
    needsSync: !lastSyncTime || Date.now() - lastSyncTime > 5 * 60 * 1000,
  };
}

// Performance monitoring hook
export function usePerformanceMonitor() {
  const queryClient = useQueryClient();
  
  const getQueryStats = () => {
    const cache = queryClient.getQueryCache();
    const queries = cache.getAll();
    
    return {
      totalQueries: queries.length,
      activeQueries: queries.filter(q => q.state.status === 'fetching').length,
      errorQueries: queries.filter(q => q.state.status === 'error').length,
      staleQueries: queries.filter(q => q.isStale()).length,
      cacheSize: cache.size,
    };
  };

  const clearCache = () => {
    queryClient.clear();
  };

  const prefetchCommonQueries = async () => {
    // Prefetch commonly accessed data
    const commonQueries = [
      ['locations'],
      ['hosts'],
    ];

    await Promise.all(
      commonQueries.map(queryKey => 
        queryClient.prefetchQuery({ 
          queryKey,
          staleTime: 5 * 60 * 1000,
        })
      )
    );
  };

  return {
    getQueryStats,
    clearCache,
    prefetchCommonQueries,
  };
}

// Error boundary for state management
export class StateManagementError extends Error {
  constructor(message: string, public readonly context?: any) {
    super(message);
    this.name = 'StateManagementError';
  }
}

// Error handling hook
export function useErrorHandler() {
  const queryClient = useQueryClient();

  const handleError = (error: Error, context?: string) => {
    console.error(`State Management Error${context ? ` in ${context}` : ''}:`, error);
    
    // Log error details for debugging
    if (process.env.NODE_ENV === 'development') {
      console.trace('Error stack trace:', error);
    }

    // Invalidate potentially corrupted queries
    const queryCache = queryClient.getQueryCache();
    const errorQueries = queryCache.getAll().filter(q => 
      q.state.status === 'error' || q.state.fetchStatus === 'fetching'
    );
    
    errorQueries.forEach(query => {
      queryClient.invalidateQueries({ queryKey: query.queryKey });
    });
  };

  const resetState = () => {
    // Reset all queries and clear cache
    queryClient.resetQueries();
    queryClient.clear();
  };

  return {
    handleError,
    resetState,
  };
}
