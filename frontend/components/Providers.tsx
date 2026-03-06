'use client';

import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { StateProvider } from './StateProvider';
import { useTheme } from '@/store';

function ThemeWrapper({ children }: { children: React.ReactNode }) {
    const { theme, setTheme } = useTheme();

    React.useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    return (
        <div className="min-h-screen transition-colors duration-300">
            {children}
            <button
                onClick={() => setTheme(theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light')}
                className="fixed bottom-6 right-6 p-4 glass-card hover:bg-white/20 transition-all z-50 text-foreground"
                aria-label="Toggle Theme"
            >
                {theme === 'light' ? '🌙' : theme === 'dark' ? '🔄' : '☀️'}
            </button>
        </div>
    );
}

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <StateProvider>
            <AuthProvider>
                <ThemeWrapper>
                    {children}
                </ThemeWrapper>
            </AuthProvider>
        </StateProvider>
    );
}
