'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { setAccessToken as setToken, getAccessToken as getToken, removeTokens as removeToken, getUserFromToken, UserPayload } from '@/lib/auth';

interface AuthContextType {
    user: UserPayload | null;
    loading: boolean;
    login: (token: string) => void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<UserPayload | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        const token = getToken();
        if (token) {
            const userData = getUserFromToken(token);
            if (userData && userData.exp * 1000 > Date.now()) {
                setUser(userData);
            } else {
                removeToken();
            }
        }
        setLoading(false);
    }, []);

    const login = (token: string) => {
        setToken(token);
        const userData = getUserFromToken(token);
        setUser(userData);
        if (userData?.role === 'SUPER_ADMIN' || userData?.role === 'ADMIN') {
            router.push('/admin');
        } else if (userData?.role === 'HOST') {
            router.push('/host');
        } else if (userData?.role === 'RECEPTIONIST') {
            router.push('/receptionist');
        } else {
            router.push('/');
        }
    };

    const logout = () => {
        removeToken();
        setUser(null);
        router.push('/login');
    };

    return (
        <AuthContext.Provider value={{ user, loading, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
