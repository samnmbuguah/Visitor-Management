'use client';

import React from 'react';
import { AuthProvider } from '@/context/AuthContext';
import { Toaster } from 'react-hot-toast';
import { StateProvider } from './StateProvider';
import { useThemeManagement } from '@/store';
import MuiThemeRegistry from './MuiThemeRegistry';

function ThemeWrapper({ children }: { children: React.ReactNode }) {
    const { theme, setTheme } = useThemeManagement();

    React.useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    return (
        <MuiThemeRegistry>
            <div className="min-h-screen transition-colors duration-300">
                {children}
            </div>
        </MuiThemeRegistry>
    );
}

export function Providers({ children }: { children: React.ReactNode }) {
    return (
        <StateProvider>
            <AuthProvider>
                <ThemeWrapper>
                    {children}
                    <Toaster position="top-right" />
                </ThemeWrapper>
            </AuthProvider>
        </StateProvider>
    );
}
