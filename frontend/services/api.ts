import api from '@/lib/api';

// Authentication API Service
export class AuthAPI {
  static async login(username: string, password: string) {
    const response = await api.post('/auth/login/', { username, password });
    return response.data;
  }

  static async logout(refresh: string) {
    const response = await api.post('/auth/logout/', { refresh });
    return response.data;
  }

  static async refreshToken(refresh: string) {
    const response = await api.post('/auth/refresh/', { refresh });
    return response.data;
  }

  static async getProfile() {
    const response = await api.get('/auth/me/');
    return response.data;
  }
}

// Property Management API Service
export class PropertyManagementAPI {
  // Maintenance Requests
  static async getMaintenanceRequests() {
    const response = await api.get('/property-management/requests/');
    return response.data.results || response.data;
  }

  static async createMaintenanceRequest(data: any) {
    const response = await api.post('/property-management/requests/', data);
    return response.data;
  }

  static async updateMaintenanceRequestStatus(id: number, status: string) {
    const response = await api.post(`/property-management/requests/${id}/update_status/`, {
      status,
    });
    return response.data;
  }

  // Categories
  static async getMaintenanceCategories() {
    const response = await api.get('/property-management/categories/');
    return response.data.results || response.data;
  }

  // Assets
  static async getAssets() {
    const response = await api.get('/property-management/assets/');
    return response.data.results || response.data;
  }

  static async createAsset(data: any) {
    const response = await api.post('/property-management/assets/', data);
    return response.data;
  }

  static async generateAssetQRCode(id: number) {
    const response = await api.get(`/property-management/assets/${id}/qr_code/`);
    return response.data;
  }

  static async checkoutAsset(id: number, data: any) {
    const response = await api.post(`/property-management/assets/${id}/checkout/`, data);
    return response.data;
  }

  // Asset Types
  static async getAssetTypes() {
    const response = await api.get('/property-management/asset-types/');
    return response.data.results || response.data;
  }

  // Vendors
  static async getVendors() {
    const response = await api.get('/property-management/vendors/');
    return response.data.results || response.data;
  }

  // Work Orders
  static async getWorkOrders() {
    const response = await api.get('/property-management/work-orders/');
    return response.data.results || response.data;
  }

  // Cost Centers
  static async getCostCenters() {
    const response = await api.get('/property-management/cost-centers/');
    return response.data.results || response.data;
  }
}

// Visitors API Service (for locations)
export class VisitorsAPI {
  static async getLocations() {
    const response = await api.get('/locations/');
    return response.data.results || response.data;
  }

  static async getHosts() {
    const response = await api.get('/hosts/');
    return response.data.results || response.data;
  }

  static async getVisitors() {
    const response = await api.get('/visitors/');
    return response.data.results || response.data;
  }

  static async getInvites() {
    const response = await api.get('/pre-registrations/');
    return response.data.results || response.data;
  }

  static async createInvite(data: any) {
    const response = await api.post('/pre-registrations/', data);
    return response.data;
  }

  static async cancelPreRegistration(id: number) {
    const response = await api.post(`/pre-registrations/${id}/cancel/`);
    return response.data;
  }
}

// Combined API Service
export const APIService = {
  auth: AuthAPI,
  propertyManagement: PropertyManagementAPI,
  visitors: VisitorsAPI,
};
