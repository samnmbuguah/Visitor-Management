'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/context/AuthContext';
import { useState, useEffect } from 'react';

const queryClient = new QueryClient();

export function Providers({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');

    useEffect(() => {
        const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
        if (savedTheme) {
            setTheme(savedTheme);
        } else if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
            setTheme('dark');
        }
    }, []);

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('theme', theme);
    }, [theme]);

    return (
        <QueryClientProvider client={queryClient}>
            <AuthProvider>
                <div className="min-h-screen transition-colors duration-300">
                    {children}
                    <button
                        onClick={() => setTheme(prev => prev === 'light' ? 'dark' : 'light')}
                        className="fixed bottom-6 right-6 p-4 glass-card hover:bg-white/20 transition-all z-50 text-foreground"
                        aria-label="Toggle Theme"
                    >
                        {theme === 'light' ? '🌙' : '☀️'}
                    </button>
                </div>
            </AuthProvider>
        </QueryClientProvider>
    );
}
