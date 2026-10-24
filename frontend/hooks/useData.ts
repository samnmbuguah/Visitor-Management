import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { APIService } from '@/services/api';

// Visitors Hooks
export function useVisitors(params?: any) {
  return useQuery({
    queryKey: ['visitors', params],
    queryFn: () => APIService.visitors.getVisitors(params),
  });
}

export function useCreateVisitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: APIService.visitors.createVisitor,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
}

export function useCheckInVisitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => APIService.visitors.checkInVisitor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
}

export function useCheckOutVisitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => APIService.visitors.checkOutVisitor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
}

export function useApproveVisitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => APIService.visitors.approveVisitor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
}

export function useRejectVisitor() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => APIService.visitors.rejectVisitor(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visitors'] });
      queryClient.invalidateQueries({ queryKey: ['dashboardStats'] });
    },
  });
}

// Pre-Registration & Invites Hooks
export function useInvites(params?: any) {
  return useQuery({
    queryKey: ['invites', params],
    queryFn: () => APIService.invites.getInvites(params),
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: APIService.invites.createInvite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites'] });
    },
  });
}

export function useBulkUploadInvites() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (formData: FormData) => APIService.invites.bulkUploadInvites(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites'] });
    },
  });
}

export function useCancelInvite() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => APIService.invites.cancelInvite(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invites'] });
    },
  });
}

export const useCancelPreRegistration = useCancelInvite;

// Locations & Kiosks Hooks
export function useLocations(params?: any) {
  return useQuery({
    queryKey: ['locations', params],
    queryFn: () => APIService.locations.getLocations(params),
  });
}

export function useCreateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: APIService.locations.createLocation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
}

export function useUpdateLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => APIService.locations.updateLocation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
}

export function useDeleteLocation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => APIService.locations.deleteLocation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['locations'] });
    },
  });
}

export function useCreateKiosk() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: APIService.locations.createKiosk,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kiosks'] });
    },
  });
}

export function useKiosks(params?: any) {
  return useQuery({
    queryKey: ['kiosks', params],
    queryFn: () => APIService.locations.getKiosks(params),
  });
}

// Hosts Hooks
export function useHosts(params?: any) {
  return useQuery({
    queryKey: ['hosts', params],
    queryFn: () => APIService.hosts.getHosts(params),
  });
}

// Watchlist Hooks
export function useWatchlist(params?: any) {
  return useQuery({
    queryKey: ['watchlist', params],
    queryFn: () => APIService.watchlist.getEntries(params),
  });
}

export function useCreateWatchlistEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: APIService.watchlist.createEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });
}

export function useDeleteWatchlistEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => APIService.watchlist.deleteEntry(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });
}

// Notifications Hooks
export function useNotificationTemplates() {
  return useQuery({
    queryKey: ['notificationTemplates'],
    queryFn: APIService.notifications.getTemplates,
  });
}

export function useNotificationLogs() {
  return useQuery({
    queryKey: ['notificationLogs'],
    queryFn: APIService.notifications.getLogs,
  });
}

// Analytics Hooks
export function useDashboardStats(locationId?: number) {
  return useQuery({
    queryKey: ['dashboardStats', locationId],
    queryFn: () => APIService.analytics.getDashboardStats(locationId),
  });
}

export function useVisitorTrends(days?: number) {
  return useQuery({
    queryKey: ['visitorTrends', days],
    queryFn: () => APIService.analytics.getVisitorTrends(days),
  });
}

export function usePeakHours(locationId?: number) {
  return useQuery({
    queryKey: ['peakHours', locationId],
    queryFn: () => APIService.analytics.getPeakHours(locationId),
  });
}

export function useSendTestNotification() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: APIService.notifications.sendTestNotification,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationLogs'] });
    },
  });
}

// Tenants Hooks
export function useTenants(params?: any) {
  return useQuery({
    queryKey: ['tenants', params],
    queryFn: () => APIService.tenants.getTenants(params),
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: APIService.tenants.createTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}

export function useUpdateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => APIService.tenants.updateTenant(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] });
    },
  });
}
