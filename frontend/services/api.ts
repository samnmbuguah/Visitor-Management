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

// Visitors API Service
export class VisitorsAPI {
  static async getVisitors(params?: any) {
    const response = await api.get('/visitors/', { params });
    return response.data.results || response.data;
  }

  static async getVisitor(id: number) {
    const response = await api.get(`/visitors/${id}/`);
    return response.data;
  }

  static async createVisitor(data: any) {
    const response = await api.post('/visitors/', data);
    return response.data;
  }

  static async checkInVisitor(id: number) {
    const response = await api.post(`/visitors/${id}/checkin/`);
    return response.data;
  }

  static async checkOutVisitor(id: number) {
    const response = await api.post(`/visitors/${id}/checkout/`);
    return response.data;
  }

  static async approveVisitor(id: number) {
    const response = await api.post(`/visitors/${id}/approve/`);
    return response.data;
  }

  static async rejectVisitor(id: number) {
    const response = await api.post(`/visitors/${id}/reject/`);
    return response.data;
  }

  static async searchReturningVisitor(query: string) {
    const response = await api.get('/visitors/search/', { params: { query } });
    return response.data;
  }
}

// Pre-Registration & Digital Invites API Service
export class InvitesAPI {
  static async getInvites(params?: any) {
    const response = await api.get('/pre-registrations/', { params });
    return response.data.results || response.data;
  }

  static async createInvite(data: any) {
    const response = await api.post('/pre-registrations/', data);
    return response.data;
  }

  static async scanInviteToken(token: string) {
    const response = await api.post('/pre-registrations/scan/', { token });
    return response.data;
  }

  static async bulkUploadInvites(formData: FormData) {
    const response = await api.post('/pre-registrations/bulk_upload/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  static async cancelInvite(id: number) {
    const response = await api.post(`/pre-registrations/${id}/cancel/`);
    return response.data;
  }
}

// Locations & Kiosks API Service
export class LocationsAPI {
  static async getLocations(params?: any) {
    const response = await api.get('/locations/', { params });
    return response.data.results || response.data;
  }

  static async createLocation(data: any) {
    const response = await api.post('/locations/', data);
    return response.data;
  }

  static async updateLocation(id: number, data: any) {
    const response = await api.patch(`/locations/${id}/`, data);
    return response.data;
  }

  static async deleteLocation(id: number) {
    const response = await api.delete(`/locations/${id}/`);
    return response.data;
  }

  static async getKiosks(params?: any) {
    const response = await api.get('/kiosks/', { params });
    return response.data.results || response.data;
  }

  static async createKiosk(data: any) {
    const response = await api.post('/kiosks/', data);
    return response.data;
  }
}

// Hosts API Service
export class HostsAPI {
  static async getHosts(params?: any) {
    const response = await api.get('/hosts/', { params });
    return response.data.results || response.data;
  }

  static async createHost(data: any) {
    const response = await api.post('/hosts/', data);
    return response.data;
  }

  static async getHostVisitors(id: number) {
    const response = await api.get(`/hosts/${id}/visitors/`);
    return response.data.results || response.data;
  }
}

// Watchlist / Blocklist API Service
export class WatchlistAPI {
  static async getEntries(params?: any) {
    const response = await api.get('/watchlist/', { params });
    return response.data.results || response.data;
  }

  static async createEntry(data: any) {
    const response = await api.post('/watchlist/', data);
    return response.data;
  }

  static async updateEntry(id: number, data: any) {
    const response = await api.patch(`/watchlist/${id}/`, data);
    return response.data;
  }

  static async deleteEntry(id: number) {
    const response = await api.delete(`/watchlist/${id}/`);
    return response.data;
  }
}

// Notifications API Service
export class NotificationsAPI {
  static async getTemplates() {
    const response = await api.get('/notification-templates/');
    return response.data.results || response.data;
  }

  static async createTemplate(data: any) {
    const response = await api.post('/notification-templates/', data);
    return response.data;
  }

  static async updateTemplate(id: number, data: any) {
    const response = await api.patch(`/notification-templates/${id}/`, data);
    return response.data;
  }

  static async deleteTemplate(id: number) {
    const response = await api.delete(`/notification-templates/${id}/`);
    return response.data;
  }

  static async getLogs() {
    const response = await api.get('/notification-logs/');
    return response.data.results || response.data;
  }

  static async sendTestNotification(data: any) {
    const response = await api.post('/notifications/test/', data);
    return response.data;
  }
}

// Analytics API Service
export class AnalyticsAPI {
  static async getDashboardStats(locationId?: number) {
    const response = await api.get('/analytics/dashboard/', {
      params: locationId ? { location: locationId } : {},
    });
    return response.data;
  }

  static async getVisitorTrends(days?: number) {
    const response = await api.get('/analytics/visitors/', {
      params: days ? { days } : {},
    });
    return response.data;
  }

  static async getPeakHours(locationId?: number) {
    const response = await api.get('/analytics/peak-hours/', {
      params: locationId ? { location: locationId } : {},
    });
    return response.data;
  }
}

// Tenants API Service
export class TenantsAPI {
  static async getTenants(params?: any) {
    const response = await api.get('/tenants/', { params });
    return response.data.results || response.data;
  }

  static async createTenant(data: any) {
    const response = await api.post('/tenants/', data);
    return response.data;
  }

  static async updateTenant(id: number, data: any) {
    const response = await api.patch(`/tenants/${id}/`, data);
    return response.data;
  }
}

// Central API Service export
export const APIService = {
  auth: AuthAPI,
  visitors: VisitorsAPI,
  invites: InvitesAPI,
  locations: LocationsAPI,
  hosts: HostsAPI,
  watchlist: WatchlistAPI,
  notifications: NotificationsAPI,
  analytics: AnalyticsAPI,
  tenants: TenantsAPI,
};

export default APIService;
