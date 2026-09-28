// Bhoomisetu — JWT Token Management
// Access tokens (15 min) + rotating refresh tokens (7 days)

import { SignJWT, jwtVerify, type JWTPayload as JosePayload } from 'jose';
import { nanoid } from 'nanoid';
import type { JWTPayload, Permission, RoleCode, LoginMode } from '@/lib/types';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'bhoomisetu-dev-secret-change-in-production-minimum-32-chars'
);

const REFRESH_SECRET = new TextEncoder().encode(
  process.env.REFRESH_SECRET || 'bhoomisetu-refresh-secret-change-in-production-min-32-chars'
);

const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY = '7d';

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;          // seconds
}

export async function createAccessToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({
    ...payload,
    type: 'access',
  } as unknown as JosePayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(ACCESS_TOKEN_EXPIRY)
    .setJti(payload.jti)
    .sign(JWT_SECRET);
}

export async function createRefreshToken(userId: string, jti: string): Promise<string> {
  return new SignJWT({
    sub: userId,
    jti,
    type: 'refresh',
  } as unknown as JosePayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(REFRESH_TOKEN_EXPIRY)
    .sign(REFRESH_SECRET);
}

export async function createTokenPair(payload: Omit<JWTPayload, 'jti'>): Promise<TokenPair> {
  const jti = nanoid();
  const fullPayload: JWTPayload = { ...payload, jti };

  const accessToken = await createAccessToken(fullPayload);
  const refreshToken = await createRefreshToken(payload.sub, jti);

  return {
    accessToken,
    refreshToken,
    expiresIn: 900, // 15 minutes in seconds
  };
}

export async function createRestrictedToken(
  userId: string,
  purpose: 'CHANGE_PASSWORD'
): Promise<string> {
  const jti = nanoid();
  return new SignJWT({
    sub: userId,
    jti,
    type: 'restricted',
    purpose,
  } as unknown as JosePayload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30m')
    .sign(JWT_SECRET);
}

export async function verifyAccessToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const p = payload as unknown as JWTPayload & { type: string };
    if (p.type !== 'access') return null;
    return p;
  } catch {
    return null;
  }
}

export async function verifyRefreshToken(
  token: string
): Promise<{ sub: string; jti: string } | null> {
  try {
    const { payload } = await jwtVerify(token, REFRESH_SECRET);
    const p = payload as unknown as { sub: string; jti: string; type: string };
    if (p.type !== 'refresh') return null;
    return { sub: p.sub, jti: p.jti };
  } catch {
    return null;
  }
}

export async function verifyRestrictedToken(
  token: string,
  expectedPurpose: string
): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const p = payload as unknown as { sub: string; type: string; purpose: string };
    if (p.type !== 'restricted' || p.purpose !== expectedPurpose) return null;
    return { sub: p.sub };
  } catch {
    return null;
  }
}
