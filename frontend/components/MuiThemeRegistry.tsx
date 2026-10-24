'use client';

import * as React from 'react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { lightTheme, darkTheme } from '@/theme/theme';
import { useThemeManagement } from '@/store';

export default function MuiThemeRegistry({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeManagement();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const activeTheme = React.useMemo(() => {
    if (!mounted) return lightTheme;
    if (theme === 'dark') return darkTheme;
    if (theme === 'system' && typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? darkTheme : lightTheme;
    }
    return lightTheme;
  }, [theme, mounted]);

  return (
    <ThemeProvider theme={activeTheme}>
      <CssBaseline />
      {children}
    </ThemeProvider>
  );
}
