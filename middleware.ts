import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export const config = {
  matcher: ['/dashboard/:path*', '/editor/:path*', '/gallery/:path*', '/templates/:path*'],
};

export default withAuth(
  function middleware(req) {
    // Check if user is admin for admin routes
    if (req.nextUrl.pathname.startsWith('/templates')) {
      const token = req.nextauth.token as any;
      if (token?.role !== 'admin') {
        return NextResponse.redirect(new URL('/dashboard', req.url));
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);
