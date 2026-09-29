// Bhoomisetu — Logout API
// POST /api/v1/auth/logout

import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  const isSecure = process.env.NODE_ENV === 'production';

  response.cookies.set('access_token', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure,
    maxAge: 0,
    path: '/',
  });

  response.cookies.set('refresh_token', '', {
    httpOnly: true,
    sameSite: 'lax',
    secure: isSecure,
    maxAge: 0,
    path: '/',
  });

  return response;
}
