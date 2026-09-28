// Bhoomisetu — Logout API
// POST /api/v1/auth/logout

import { NextResponse } from 'next/server';

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });

  response.cookies.set('access_token', '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: false,
    maxAge: 0,
    path: '/',
  });

  response.cookies.set('refresh_token', '', {
    httpOnly: true,
    sameSite: 'strict',
    secure: false,
    maxAge: 0,
    path: '/',
  });

  return response;
}
