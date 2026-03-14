import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const ACCESS_TOKEN_KEY = 'vm_access_token';

export function middleware(request: NextRequest) {
  const token = request.cookies.get(ACCESS_TOKEN_KEY)?.value;
  const { pathname } = request.nextUrl;

  // Define protected routes and their required roles
  const protectedRoutes = [
    { path: '/admin', roles: ['SUPER_ADMIN', 'ADMIN'] },
    { path: '/host', roles: ['HOST', 'SUPER_ADMIN', 'ADMIN'] },
    { path: '/receptionist', roles: ['RECEPTIONIST', 'SUPER_ADMIN', 'ADMIN'] },
    { path: '/profile', roles: ['SUPER_ADMIN', 'ADMIN', 'HOST', 'RECEPTIONIST'] },
  ];

  const currentProtectedroute = protectedRoutes.find(route => pathname.startsWith(route.path));

  if (currentProtectedroute) {
    if (!token) {
      return NextResponse.redirect(new URL('/login', request.url));
    }

    try {
      // Decode JWT payload manually to avoid dependency issues in Edge Runtime
      const payloadBase64 = token.split('.')[1];
      const payload = JSON.parse(atob(payloadBase64));
      
      const userRole = payload.role;
      const isExpired = payload.exp * 1000 < Date.now();

      if (isExpired) {
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete(ACCESS_TOKEN_KEY);
        return response;
      }

      if (!currentProtectedroute.roles.includes(userRole)) {
        // Redirect to their default dashboard if they are on a wrong page
        if (userRole === 'HOST') return NextResponse.redirect(new URL('/host', request.url));
        if (userRole === 'RECEPTIONIST') return NextResponse.redirect(new URL('/receptionist', request.url));
        if (userRole === 'ADMIN' || userRole === 'SUPER_ADMIN') return NextResponse.redirect(new URL('/admin', request.url));
        
        return NextResponse.redirect(new URL('/login', request.url));
      }
    } catch (e) {
      return NextResponse.redirect(new URL('/login', request.url));
    }
  }

  // Redirect from login if already authenticated
  if (pathname === '/login' && token) {
    try {
      const payloadBase64 = token.split('.')[1];
      const payload = JSON.parse(atob(payloadBase64));
      if (payload.exp * 1000 > Date.now()) {
        const userRole = payload.role;
        if (userRole === 'HOST') return NextResponse.redirect(new URL('/host', request.url));
        if (userRole === 'RECEPTIONIST') return NextResponse.redirect(new URL('/receptionist', request.url));
        return NextResponse.redirect(new URL('/admin', request.url));
      }
    } catch (e) {
      // Ignore invalid tokens on login page
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
