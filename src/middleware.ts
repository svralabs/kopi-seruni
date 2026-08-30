import { NextRequest, NextResponse } from 'next/server';

// Middleware berjalan di Edge runtime — TIDAK import db di sini.
// Gunakan cookie cache BetterAuth untuk validasi session tanpa DB hit.
export async function middleware(req: NextRequest) {
  // Cek session dari cookie (BetterAuth cookie cache)
  const sessionToken = req.cookies.get('better-auth.session_token')?.value
    ?? req.cookies.get('__Secure-better-auth.session_token')?.value;

  if (!sessionToken) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/pos/:path*',
    '/products/:path*',
    '/expenses/:path*',
    '/profit-loss/:path*',
    '/bagi-hasil/:path*',
    '/stok/:path*',
    '/shift/:path*',
    '/settings/:path*',
  ],
};
