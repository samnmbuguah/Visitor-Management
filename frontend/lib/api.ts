import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export interface Host {
    id: number;
    name: string;
    email: string;
    department: string;
    phone?: string;
}

export interface Visitor {
    id: number;
    name: string;
    email: string;
    phone: string;
    host: number;
    host_name?: string;
    purpose: string;
    photo?: string;
    checkin_time: string;
    checkout_time?: string;
    status: 'CHECKED_IN' | 'CHECKED_OUT';
}

export interface VisitorCreate {
    name: string;
    email: string;
    phone: string;
    host: number;
    purpose: string;
    photo?: string;
}

// Hosts
export const getHosts = () => api.get<Host[]>('/hosts/');
export const createHost = (data: Omit<Host, 'id'>) => api.post<Host>('/hosts/', data);

// Visitors
export const getVisitors = () => api.get<Visitor[]>('/visitors/');
export const getActiveVisitors = () => api.get<Visitor[]>('/visitors/?status=CHECKED_IN');
export const createVisitor = (data: VisitorCreate) => api.post<Visitor>('/visitors/', data);
export const checkoutVisitor = (id: number) => api.post<Visitor>(`/visitors/${id}/checkout/`);

export default api;
