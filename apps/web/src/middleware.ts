import { auth } from './auth';
import { NextResponse } from 'next/server';

const PROTECTED = ['/dashboard', '/session', '/profile', '/onboarding'];

export default auth((req) => {
  const isLoggedIn = !!req.auth;
  const path = req.nextUrl.pathname;
  const isProtected = PROTECTED.some((p) => path.startsWith(p));

  if (isProtected && !isLoggedIn) {
    const loginUrl = new URL('/login', req.url);
    loginUrl.searchParams.set('callbackUrl', req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }
});

export const config = {
  // Skip Next.js internals and static assets
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
