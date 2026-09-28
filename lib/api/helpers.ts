// Bhoomisetu — API Helper Utilities
// Standard error responses, auth extraction, request ID generation

import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';
import { verifyAccessToken } from '@/lib/auth/jwt';
import type { AuthUser, JWTPayload, ErrorCode } from '@/lib/types';

export function createRequestId(): string {
  return `req_${nanoid(16)}`;
}

export function errorResponse(
  code: ErrorCode,
  message: string,
  status: number = 400,
  requestId?: string
): NextResponse {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        requestId: requestId || createRequestId(),
      },
    },
    { status }
  );
}

export function successResponse(data: unknown, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export async function getAuthUser(req: NextRequest): Promise<AuthUser | null> {
  // Try Authorization header first
  const authHeader = req.headers.get('Authorization');
  let token: string | undefined;

  if (authHeader?.startsWith('Bearer ')) {
    token = authHeader.slice(7);
  }

  // Then try cookies
  if (!token) {
    token = req.cookies.get('access_token')?.value;
  }

  if (!token) return null;

  const payload = await verifyAccessToken(token);
  if (!payload) return null;

  return {
    id: payload.sub,
    uid: payload.sub,
    role: payload.role,
    roleLevel: payload.roleLevel,
    jurisdictionId: payload.jurisdictionId,
    jurisdictionPath: payload.jurisdictionPath,
    permissions: payload.permissions,
    mode: payload.mode,
    fullName: '', // loaded from DB when needed
  };
}

export async function requireAuth(req: NextRequest): Promise<{
  user: AuthUser;
  requestId: string;
} | NextResponse> {
  const requestId = createRequestId();
  const user = await getAuthUser(req);

  if (!user) {
    return errorResponse('FORBIDDEN_ACTION', 'Authentication required', 401, requestId);
  }

  return { user, requestId };
}

export function requirePermission(
  user: AuthUser,
  permission: string,
  requestId: string
): NextResponse | null {
  if (!user.permissions.includes(permission as any)) {
    return errorResponse('FORBIDDEN_ACTION', `Missing permission: ${permission}`, 403, requestId);
  }
  return null;
}

export function requireRole(
  user: AuthUser,
  roles: string[],
  requestId: string
): NextResponse | null {
  if (!roles.includes(user.role)) {
    return errorResponse('FORBIDDEN_ACTION', 'Insufficient role privileges', 403, requestId);
  }
  return null;
}

export function checkJurisdiction(
  userPath: string | null,
  recordPath: string,
  requestId: string
): NextResponse | null {
  if (!userPath) return null; // citizens don't have jurisdiction paths
  // Record's jurisdiction path must be a descendant of (or equal to) the user's
  if (!recordPath.startsWith(userPath)) {
    return errorResponse('OUT_OF_JURISDICTION', 'Record is outside your jurisdiction', 403, requestId);
  }
  return null;
}

export function getClientIP(req: NextRequest): string {
  return req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    '127.0.0.1';
}

export function getUserAgent(req: NextRequest): string {
  return req.headers.get('user-agent') || 'unknown';
}
