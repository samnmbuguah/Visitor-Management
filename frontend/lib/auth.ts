import { jwtDecode } from 'jwt-decode';

const ACCESS_TOKEN_KEY = 'vm_access_token';
const REFRESH_TOKEN_KEY = 'vm_refresh_token';

export interface UserPayload {
    user_id: number;
    username: string;
    email: string;
    role: 'SUPER_ADMIN' | 'ADMIN' | 'HOST' | 'RECEPTIONIST';
    exp: number;
}

export const setTokens = (access: string, refresh: string) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(ACCESS_TOKEN_KEY, access);
        localStorage.setItem(REFRESH_TOKEN_KEY, refresh);
        // Also set in cookie for middleware
        document.cookie = `${ACCESS_TOKEN_KEY}=${access}; path=/; max-age=86400; SameSite=Lax`;
    }
};

export const setAccessToken = (token: string) => {
    if (typeof window !== 'undefined') {
        localStorage.setItem(ACCESS_TOKEN_KEY, token);
        document.cookie = `${ACCESS_TOKEN_KEY}=${token}; path=/; max-age=86400; SameSite=Lax`;
    }
};

export const getAccessToken = (): string | null => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem(ACCESS_TOKEN_KEY);
    }
    return null;
};

export const getRefreshToken = (): string | null => {
    if (typeof window !== 'undefined') {
        return localStorage.getItem(REFRESH_TOKEN_KEY);
    }
    return null;
};

export const removeTokens = () => {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(ACCESS_TOKEN_KEY);
        localStorage.removeItem(REFRESH_TOKEN_KEY);
        document.cookie = `${ACCESS_TOKEN_KEY}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
    }
};

export const getUserFromToken = (token: string): UserPayload | null => {
    try {
        return jwtDecode<UserPayload>(token);
    } catch (err) {
        return null;
    }
};

export const isAuthenticated = (): boolean => {
    const token = getAccessToken();
    if (!token) return false;
    const user = getUserFromToken(token);
    if (!user) return false;
    return user.exp * 1000 > Date.now();
};
