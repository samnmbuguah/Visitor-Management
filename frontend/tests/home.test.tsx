import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import Home from '../app/page';

// Mock Next.js Link
vi.mock('next/link', () => {
    return {
        default: ({ children, href }: { children: React.ReactNode; href: string }) => {
            return <a href={href}>{children}</a>;
        },
    };
});

// Mock AuthContext
vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        user: null,
        loading: false,
        login: vi.fn(),
        logout: vi.fn()
    }),
    AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>
}));

describe('Home Page', () => {
    it('renders the welcome message', () => {
        render(<Home />);
        expect(screen.getByText(/Welcome/i)).toBeDefined();
        expect(screen.getByText(/Visitor Management System/i)).toBeDefined();
    });

    it('renders check-in and check-out buttons', () => {
        render(<Home />);
        expect(screen.getByText('Check In')).toBeDefined();
        expect(screen.getByText('Check Out')).toBeDefined();
    });

    it('renders staff login link', () => {
        render(<Home />);
        expect(screen.getByText(/Staff Login/i)).toBeDefined();
    });
});
