import './globals.css';
import { Providers } from '@/components/Providers';
import Navigation from '@/components/Navigation';
import { ErrorBoundary } from '@/components/ErrorBoundary';

export const metadata = {
  title: 'Property Management | Premium Platform',
  description: 'A modern, secure property and visitor management system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased" suppressHydrationWarning>
        <ErrorBoundary>
          <Providers>
            <Navigation />
            {children}
          </Providers>
        </ErrorBoundary>
      </body>
    </html>
  );
}
