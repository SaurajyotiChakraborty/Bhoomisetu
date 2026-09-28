// Bhoomisetu — Login API (§3.5)
// POST /api/v1/auth/login
// ⚠️ DEV MODE: Password verification BYPASSED for workflow testing

import { NextRequest, NextResponse } from 'next/server';
import { loginSchema } from '@/lib/validations/schemas';
import { createTokenPair } from '@/lib/auth/jwt';
import { verifyPassword } from '@/lib/auth/password';
import { errorResponse, successResponse, createRequestId } from '@/lib/api/helpers';
import { ROLE_PERMISSIONS } from '@/lib/config/roles';
import Database from 'better-sqlite3';
import path from 'path';
import type { RoleCode, Permission, LoginMode } from '@/lib/types';

function getDb() {
  const DB_PATH = process.env.DATABASE_URL || path.join(process.cwd(), 'data', 'bhoomisetu.db');
  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
  return db;
}

interface CitizenRow {
  id: string;
  citizen_uid: string;
  full_name: string;
  email: string;
  status: string;
  password_hash: string;
  failed_login_attempts: number;
  locked_until: string | null;
}

interface OfficerRow {
  id: string;
  officer_uid: string;
  full_name: string;
  email: string;
  status: string;
  role_code: string;
  jurisdiction_id: string;
  password_hash: string;
  failed_login_attempts: number;
  locked_until: string | null;
}

export async function POST(req: NextRequest) {
  const requestId = createRequestId();

  try {
    const body = await req.json();

    // 1. Validate input
    const result = loginSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('VALIDATION_ERROR', 'Invalid credentials', 400, requestId);
    }

    const { identifier, password, mode } = result.data;
    const db = getDb();

    try {
      // 2. Look up the identifier
      let user: CitizenRow | OfficerRow | null = null;
      const tableName = mode === 'CITIZEN' ? 'citizens' : 'officers';

      if (mode === 'CITIZEN') {
        user = db.prepare(
          'SELECT id, citizen_uid, full_name, email, status, password_hash, failed_login_attempts, locked_until FROM citizens WHERE citizen_uid = ? OR email = ?'
        ).get(identifier, identifier) as CitizenRow | null;
      } else {
        user = db.prepare(
          'SELECT id, officer_uid, full_name, email, status, role_code, jurisdiction_id, password_hash, failed_login_attempts, locked_until FROM officers WHERE officer_uid = ? OR email = ?'
        ).get(identifier, identifier) as OfficerRow | null;
      }

      if (!user) {
        return errorResponse('INVALID_CREDENTIALS', 'Invalid credentials — user not found', 401, requestId);
      }

      // Check account status and lockouts
      if (user.status === 'LOCKED' || (user.locked_until && new Date(user.locked_until) > new Date())) {
        return errorResponse('FORBIDDEN_ACTION', 'Account is temporarily locked. Please try again later or contact support.', 403, requestId);
      }

      if (user.status === 'SUSPENDED' || user.status === 'RETIRED') {
        return errorResponse('FORBIDDEN_ACTION', `Account is ${user.status.toLowerCase()}`, 403, requestId);
      }

      // Password verification using verifyPassword with dev-fallback
      let isValidPassword = false;
      if (user.password_hash) {
        isValidPassword = await verifyPassword(user.password_hash, password);
      }
      
      // Dev mode fallback for seed credentials (Demo@12345)
      if (!isValidPassword && (password === 'Demo@12345' || password === 'Demo@1234')) {
        isValidPassword = true;
      }

      if (!isValidPassword) {
        const attempts = (user.failed_login_attempts || 0) + 1;
        const willLock = attempts >= 5;
        const lockUntil = willLock ? new Date(Date.now() + 15 * 60 * 1000).toISOString() : null;

        db.prepare(`
          UPDATE ${tableName} 
          SET failed_login_attempts = ?, locked_until = ?, status = CASE WHEN ? THEN 'LOCKED' ELSE status END 
          WHERE id = ?
        `).run(attempts, lockUntil, willLock ? 1 : 0, user.id);

        return errorResponse(
          'INVALID_CREDENTIALS',
          willLock ? 'Too many failed attempts. Account locked for 15 minutes.' : 'Invalid credentials',
          401,
          requestId
        );
      }

      // Reset failed attempts on successful authentication
      if (user.failed_login_attempts > 0) {
        db.prepare(`UPDATE ${tableName} SET failed_login_attempts = 0, locked_until = NULL WHERE id = ?`).run(user.id);
      }


      // Load role, jurisdiction, permissions from DB
      let role: RoleCode;
      let roleLevel: number;
      let jurisdictionId: string | null = null;
      let jurisdictionPath: string | null = null;
      let permissions: Permission[];
      let dashboardRoute: string;
      let uid: string;

      if (mode === 'CITIZEN') {
        role = 'CITIZEN';
        roleLevel = 7;
        permissions = ROLE_PERMISSIONS.CITIZEN;
        dashboardRoute = '/dashboard/citizen';
        uid = (user as CitizenRow).citizen_uid;
      } else {
        const officer = user as OfficerRow;
        role = officer.role_code as RoleCode;
        const roleRow = db.prepare('SELECT level, dashboard_route FROM roles WHERE code = ?').get(role) as { level: number; dashboard_route: string } | undefined;
        roleLevel = roleRow?.level || 7;
        dashboardRoute = roleRow?.dashboard_route || '/dashboard/citizen';
        jurisdictionId = officer.jurisdiction_id;
        uid = officer.officer_uid;

        // Load jurisdiction path
        const jRow = db.prepare('SELECT path FROM jurisdictions WHERE id = ?').get(jurisdictionId) as { path: string } | undefined;
        jurisdictionPath = jRow?.path || null;

        permissions = ROLE_PERMISSIONS[role] || [];
      }

      // Issue JWT
      const tokenPair = await createTokenPair({
        sub: uid,
        role,
        roleLevel,
        jurisdictionId,
        jurisdictionPath,
        permissions,
        mode,
      });

      // Set cookies and return
      const response = NextResponse.json({
        user: {
          uid,
          fullName: user.full_name,
          role,
          roleLevel,
          dashboardRoute,
          mode,
        },
        expiresIn: tokenPair.expiresIn,
      });

      response.cookies.set('access_token', tokenPair.accessToken, {
        httpOnly: true,
        sameSite: 'strict',
        secure: false, // DEV: no HTTPS
        maxAge: 15 * 60,
        path: '/',
      });

      response.cookies.set('refresh_token', tokenPair.refreshToken, {
        httpOnly: true,
        sameSite: 'strict',
        secure: false,
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });

      console.log(`✅ [DEV LOGIN] ${uid} (${role}) → ${dashboardRoute}`);

      return response;
    } finally {
      db.close();
    }
  } catch (error) {
    console.error('Login error:', error);
    return errorResponse('INTERNAL_ERROR', 'Login failed', 500, requestId);
  }
}
