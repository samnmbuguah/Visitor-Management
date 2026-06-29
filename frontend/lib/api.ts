import axios from 'axios';

const getApiUrl = () => {
    // Use explicit env var if set (e.g. https://pmapi.213-199-50-129.sslip.io/api)
    if (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_BASE_URL) {
        return process.env.NEXT_PUBLIC_API_BASE_URL;
    }
    if (typeof window !== 'undefined') {
        const isDevelopment = process.env.NODE_ENV === 'development';
        const isLocalAccess = window.location.hostname === 'localhost' ||
                            window.location.hostname === '127.0.0.1';

        if (isDevelopment && isLocalAccess) {
            return 'http://localhost:8001/api';
        }

        // Use HTTPS via the dedicated API subdomain (Caddy reverse proxy on port 443)
        const parts = window.location.hostname.split('.');
        parts[0] = 'pmapi';
        return `https://${parts.join('.')}/api`;
    }
    return 'http://localhost:8001/api';
};

const api = axios.create({
    baseURL: getApiUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add a request interceptor to attach the access token
api.interceptors.request.use((config) => {
    if (typeof window !== 'undefined') {
        const token = localStorage.getItem('vm_access_token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
    }
    return config;
});

// Add a response interceptor to handle token refresh
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // If the error is 401 and not already retrying
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            const refreshToken = typeof window !== 'undefined' ? localStorage.getItem('vm_refresh_token') : null;

            if (refreshToken) {
                try {
                    // Try to refresh the token
                    // Use direct axios to avoid interceptor loop
                    const refreshResponse = await axios.post(`${getApiUrl()}/auth/refresh/`, {
                        refresh: refreshToken,
                    });

                    const { access } = refreshResponse.data;

                    if (typeof window !== 'undefined') {
                        localStorage.setItem('vm_access_token', access);
                    }

                    // Retry the original request with the new token
                    originalRequest.headers.Authorization = `Bearer ${access}`;
                    return api(originalRequest);
                } catch (refreshError) {
                    // Refresh failed, logout
                    if (typeof window !== 'undefined') {
                        localStorage.removeItem('vm_access_token');
                        localStorage.removeItem('vm_refresh_token');
                        window.location.href = '/login';
                    }
                    return Promise.reject(refreshError);
                }
            } else {
                // No refresh token, logout
                if (typeof window !== 'undefined') {
                    window.location.href = '/login';
                }
            }
        }

        return Promise.reject(error);
    }
);



export interface Host {
    id: number;
    name: string;
    email: string;
    phone?: string;
    department: string;
    location?: number;
    location_name?: string;
    visitor_count?: number;
}

export interface Location {
    id: number;
    name: string;
    address: string;
    floor: string;
    require_visitor_approval: boolean;
    nda_content?: string;
    require_nda: boolean;
    is_active: boolean;
    active_visitor_count?: number;
    host_count?: number;
    kiosk_count?: number;
    created_at: string;
    updated_at: string;
}

export interface Kiosk {
    id: number;
    name: string;
    location: number;
    location_name?: string;
    qr_code_prefix: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface WatchlistEntry {
    id: number;
    name: string;
    email: string;
    phone: string;
    company?: string;
    reason: string;
    match_type?: string;
    is_active: boolean;
    location?: number;
    location_name?: string;
    created_at: string;
    updated_at: string;
}

export interface VisitorType {
    id: number;
    name: string;
    description: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface NotificationTemplate {
    id: number;
    name: string;
    type: string;
    subject: string;
    body: string;
    is_active: boolean;
    location?: number;
    location_name?: string;
    created_at: string;
    updated_at: string;
}

export interface NotificationLog {
    id: number;
    template: number;
    template_name: string;
    recipient_email: string;
    subject: string;
    body: string;
    status: string;
    sent_at: string;
    visitor?: number;
    visitor_name?: string;
    host?: number;
    host_name?: string;
}

export interface PreRegistration {
    id: number;
    visitor_name: string;
    visitor_email: string;
    visitor_phone: string;
    visitor_company?: string;
    visitor_number_plate?: string;
    purpose: string;
    visitor_type?: number;
    visitor_type_name?: string;
    expected_duration?: number;
    expected_arrival?: string;
    host?: number;
    host_name?: string;
    host_email?: string;
    location?: number;
    location_name?: string;
    status: string;
    created_at: string;
    updated_at: string;
    checkin_time?: string;
    checkout_time?: string;
    qr_code?: string;
}

export interface Visitor {
    id: number;
    name: string;
    email: string;
    phone: string;
    purpose: string;
    status: 'PENDING' | 'CHECKED_IN' | 'CHECKED_OUT' | 'REJECTED';
    photo?: string;
    checkin_time: string;
    checkout_time?: string;
    host_name?: string;
    location_name?: string;
}

export interface VisitorCreate {
    name: string;
    email: string;
    phone: string;
    host: number;
    purpose: string;
    photo?: string;
    company?: string;
    nda_accepted?: boolean;
    signature?: string;
    visitor_type?: number;
    expected_duration?: number | null;
    location?: number;
    status?: string;
}

export interface DashboardStats {
    active_visitors: number;
    today_visitors: number;
    week_visitors: number;
    total_hosts: number;
}

export interface SecurityDashboardData {
    summary: {
        total_access_attempts: number;
        access_granted: number;
        access_denied: number;
        active_visitors: number;
    };
    cameras: {
        total: number;
        online: number;
        offline: number;
    };
    recent_activity: {
        gate_logs: any[];
        incidents: any[];
        alerts: any[];
    };
    threat_indicators: any;
}

export interface Camera {
    id: string;
    name: string;
    location: number;
    location_name?: string;
    stream_url: string;
    is_active: boolean;
    last_ping?: string;
    status: 'ONLINE' | 'OFFLINE';
    total_detections?: number;
}

export interface Lease {
    id: number;
    unit_number: string;
    tenant: number;
    tenant_name: string;
    monthly_rent: number;
    start_date: string;
    end_date: string;
    status: 'ACTIVE' | 'EXPIRING' | 'EXPIRED' | 'TERMINATED';
    status_display: string;
    created_at: string;
}

// Auth
export const loginUser = (data: any) => api.post('/auth/login/', data);
export const refreshToken = (refresh: string) => api.post('/auth/refresh/', { refresh });

// Visitors
export const getVisitors = (params?: any) => api.get('/visitors/', { params });
export const createVisitor = (data: VisitorCreate) => api.post('/visitors/', data);
export const searchVisitor = (query: string) => api.get('/visitors/search/', { params: { query } });
export const approveVisitor = (id: number) => api.post(`/visitors/${id}/approve/`);
export const rejectVisitor = (id: number) => api.post(`/visitors/${id}/reject/`);
export const checkoutVisitor = (id: number) => api.post(`/visitors/${id}/checkout/`);

// Hosts
export const getHosts = (params?: any) => api.get('/hosts/', { params });

// Locations
export const getLocations = () => api.get('/locations/');
export const createLocation = (data: any) => api.post('/locations/', data);
export const updateLocation = (id: number, data: any) => api.put(`/locations/${id}/`, data);
export const deleteLocation = (id: number) => api.delete(`/locations/${id}/`);

// Kiosks
export const getKiosks = (location?: number) => api.get('/kiosks/', { params: { location } });
export const createKiosk = (data: any) => api.post('/kiosks/', data);
export const deleteKiosk = (id: number) => api.delete(`/kiosks/${id}/`);

// Watchlist
export const getWatchlist = (location?: number) => api.get('/watchlist/', { params: { location } });
export const addToWatchlist = (data: any) => api.post('/watchlist/', data);
export const removeFromWatchlist = (id: number) => api.delete(`/watchlist/${id}/`);

// Pre-registration / Invites
export const getInvites = () => api.get('/pre-registrations/');
export const createInvite = (data: any) => api.post('/pre-registrations/', data);
export const getVisitorTypes = () => api.get('/visitor-types/');
export const scanPreRegistration = (token: string) => api.get(`/pre-registrations/scan/?token=${token}`);
export const checkinPreRegistration = (id: number) => api.post(`/pre-registrations/${id}/checkin/`);
export const cancelPreRegistration = (id: number) => api.post(`/pre-registrations/${id}/cancel/`);
export const bulkUploadPreRegistrations = (data: FormData) => api.post('/pre-registrations/bulk-upload/', data);

// Analytics
export const getDashboardStats = (location?: number) => api.get('/analytics/dashboard/', { params: { location } });

// Notification Templates
export const getNotificationTemplates = (location?: number) => api.get('/notification-templates/', { params: { location } });
export const createNotificationTemplate = (data: any) => api.post('/notification-templates/', data);
export const updateNotificationTemplate = (id: number, data: any) => api.put(`/notification-templates/${id}/`, data);
export const deleteNotificationTemplate = (id: number) => api.delete(`/notification-templates/${id}/`);
export const getNotificationLogs = (location?: number) => api.get('/notification-logs/', { params: { location } });

// Property Management
export const getAssets = (params?: any) => api.get('/property-management/assets/', { params });
export const createAsset = (data: any) => api.post('/property-management/assets/', data);
export const getAssetTypes = () => api.get('/property-management/asset-types/');
export const getMaintenanceRequests = (params?: any) => api.get('/property-management/requests/', { params });
export const createMaintenanceRequest = (data: any) => api.post('/property-management/requests/', data);
export const getVendors = (params?: any) => api.get('/property-management/vendors/', { params });
export const createVendor = (data: any) => api.post('/property-management/vendors/', data);
export const getMaintenanceCategories = () => api.get('/property-management/categories/');
export const getMaintenanceSchedules = (params?: any) => api.get('/property-management/schedules/', { params });
export const getWorkOrders = (params?: any) => api.get('/property-management/work-orders/', { params });

// Security & Cameras
export const getSecurityDashboard = (params?: any) => api.get('/security/dashboard/', { params });
export const getLiveCamera = (cameraId?: string) => api.get('/security/camera/', { params: { camera_id: cameraId } });
export const gateControl = (data: { action: string; camera_id?: string; reason?: string }) => api.post('/security/gate/', data);
export const getCameras = () => api.get('/cameras/');
export const createCamera = (data: any) => api.post('/cameras/', data);
export const updateCamera = (id: string, data: any) => api.put(`/cameras/${id}/`, data);
export const deleteCamera = (id: string) => api.delete(`/cameras/${id}/`);

// User Profile
export const getMyProfile = () => api.get('/auth/me/');
export const updateMyProfile = (data: any) => api.patch('/auth/me/', data);

export default api;
