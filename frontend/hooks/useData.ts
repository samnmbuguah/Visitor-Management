import { useAuthenticatedQuery, useAuthenticatedMutation } from '@/hooks/useAuthQuery';
import { APIService } from '@/services/api';

// Property Management Hooks
export function useMaintenanceRequests() {
  return useAuthenticatedQuery(
    ['maintenanceRequests'],
    APIService.propertyManagement.getMaintenanceRequests
  );
}

export function useMaintenanceCategories() {
  return useAuthenticatedQuery(
    ['maintenanceCategories'],
    APIService.propertyManagement.getMaintenanceCategories
  );
}

export function useAssets() {
  return useAuthenticatedQuery(
    ['assets'],
    APIService.propertyManagement.getAssets
  );
}

export function useAssetTypes() {
  return useAuthenticatedQuery(
    ['assetTypes'],
    APIService.propertyManagement.getAssetTypes
  );
}

export function useVendors() {
  return useAuthenticatedQuery(
    ['vendors'],
    APIService.propertyManagement.getVendors
  );
}

export function useWorkOrders() {
  return useAuthenticatedQuery(
    ['workOrders'],
    APIService.propertyManagement.getWorkOrders
  );
}

export function useCostCenters() {
  return useAuthenticatedQuery(
    ['costCenters'],
    APIService.propertyManagement.getCostCenters
  );
}

export function useLeases(params?: any) {
  return useAuthenticatedQuery(
    ['leases', params],
    () => APIService.propertyManagement.getLeases(params)
  );
}

// Visitors/Invites Hooks
export function useInvites() {
  return useAuthenticatedQuery(
    ['invites'],
    APIService.visitors.getInvites
  );
}

export function useTenants(params?: any) {
  return useAuthenticatedQuery(
    ['tenants', params],
    () => APIService.visitors.getTenants(params)
  );
}

// Visitors Hooks
export function useLocations() {
  return useAuthenticatedQuery(
    ['locations'],
    APIService.visitors.getLocations
  );
}

export function useHosts() {
  return useAuthenticatedQuery(
    ['hosts'],
    APIService.visitors.getHosts
  );
}

export function useVisitors() {
  return useAuthenticatedQuery(
    ['visitors'],
    APIService.visitors.getVisitors
  );
}

// Mutation Hooks
export function useCreateMaintenanceRequest() {
  return useAuthenticatedMutation(
    APIService.propertyManagement.createMaintenanceRequest
  );
}

export function useUpdateMaintenanceRequestStatus() {
  return useAuthenticatedMutation(
    ({ id, status }: { id: number; status: string }) => 
      APIService.propertyManagement.updateMaintenanceRequestStatus(id, status)
  );
}

export function useCreateAsset() {
  return useAuthenticatedMutation(
    APIService.propertyManagement.createAsset
  );
}

export function useGenerateAssetQRCode() {
  return useAuthenticatedMutation(
    (id: number) => APIService.propertyManagement.generateAssetQRCode(id)
  );
}

export function useCheckoutAsset() {
  return useAuthenticatedMutation(
    ({ id, data }: { id: number; data: any }) => 
      APIService.propertyManagement.checkoutAsset(id, data)
  );
}

export function useCreateInvite() {
  return useAuthenticatedMutation(
    APIService.visitors.createInvite
  );
}

export function useCancelPreRegistration() {
  return useAuthenticatedMutation(
    APIService.visitors.cancelPreRegistration
  );
}

export function useCreateLease() {
  return useAuthenticatedMutation(
    APIService.propertyManagement.createLease
  );
}

export function useUpdateLease() {
  return useAuthenticatedMutation(
    ({ id, data }: { id: number; data: any }) => 
      APIService.propertyManagement.updateLease(id, data)
  );
}

export function useDeleteLease() {
  return useAuthenticatedMutation(
    (id: number) => APIService.propertyManagement.deleteLease(id)
  );
}

export function useCreateTenant() {
  return useAuthenticatedMutation(
    APIService.visitors.createTenant
  );
}
