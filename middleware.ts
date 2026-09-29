import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE, dashboardFor, verifySession } from './lib/session';

// Role-based route protection:
//  - /candidate/*  → candidates only
//  - /recruiter/*  → recruiters only
//  - Logged-out users are sent to /login; users of the other role are sent to their own dashboard.
//  - Logged-in users visiting /login or /signup go straight to their dashboard.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  const area = pathname.startsWith('/candidate') ? 'candidate' : pathname.startsWith('/recruiter') ? 'recruiter' : null;

  if (area) {
    if (!session) {
      const url = new URL('/login', req.url);
      url.searchParams.set('next', pathname);
      return NextResponse.redirect(url);
    }
    if (session.role !== area) {
      return NextResponse.redirect(new URL(dashboardFor(session.role), req.url));
    }
  }

  if ((pathname === '/login' || pathname === '/signup') && session) {
    return NextResponse.redirect(new URL(dashboardFor(session.role), req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/candidate/:path*', '/recruiter/:path*', '/login', '/signup'],
};
