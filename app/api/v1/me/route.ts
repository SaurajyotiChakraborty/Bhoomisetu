// Bhoomisetu — Current User API
// GET /api/v1/me

import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/lib/api/helpers';
import Database from 'better-sqlite3';
import path from 'path';

function getDb() {
  const DB_PATH = process.env.DATABASE_URL || path.join(process.cwd(), 'data', 'bhoomisetu.db');
  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
  return db;
}

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const { user, requestId } = authResult;
  const db = getDb();

  try {
    if (user.mode === 'CITIZEN') {
      const citizen = db.prepare(
        'SELECT citizen_uid, full_name, email, mobile, aadhaar_masked, pan_masked, date_of_birth, address_line1, address_line2, village_town, district, state, pin, status, created_at FROM citizens WHERE citizen_uid = ?'
      ).get(user.uid) as Record<string, unknown> | undefined;

      if (!citizen) {
        return errorResponse('NOT_FOUND', 'User not found', 404, requestId);
      }

      // Count owned parcels
      const parcelCount = db.prepare(
        'SELECT COUNT(*) as count, COALESCE(SUM(area_declared_sqm), 0) as totalArea FROM parcels WHERE current_owner_id = (SELECT id FROM citizens WHERE citizen_uid = ?)'
      ).get(user.uid) as { count: number; totalArea: number };

      return successResponse({
        ...citizen,
        role: 'CITIZEN',
        roleLevel: 7,
        dashboardRoute: '/dashboard/citizen',
        parcelsOwned: parcelCount.count,
        totalAreaSqm: parcelCount.totalArea,
        permissions: user.permissions,
      });
    } else {
      const officer = db.prepare(
        `SELECT o.officer_uid, o.full_name, o.email, o.mobile, o.role_code, o.status,
                o.effective_from, o.created_at,
                j.name as jurisdiction_name, j.type as jurisdiction_type, j.path as jurisdiction_path
         FROM officers o
         JOIN jurisdictions j ON o.jurisdiction_id = j.id
         WHERE o.officer_uid = ?`
      ).get(user.uid) as Record<string, unknown> | undefined;

      if (!officer) {
        return errorResponse('NOT_FOUND', 'Officer not found', 404, requestId);
      }

      // Count cases in jurisdiction
      const jurisdictionPath = officer.jurisdiction_path as string;
      const caseCount = db.prepare(
        `SELECT COUNT(*) as count FROM transfers t
         JOIN parcels p ON t.parcel_id = p.id
         JOIN jurisdictions j ON p.jurisdiction_id = j.id
         WHERE j.path LIKE ? AND t.status NOT IN ('TRANSFER_COMPLETED', 'REJECTED', 'CANCELLED_BY_APPLICANT', 'COUNTERPARTY_DECLINED')`
      ).get(`${jurisdictionPath}%`) as { count: number };

      const roleToDashboard: Record<string, string> = {
        DIV_COMM: '/dashboard/division',
        DIST_COLL: '/dashboard/district',
        SDO: '/dashboard/sdo',
        TEHSILDAR: '/dashboard/tehsildar',
        CIRCLE_OFF: '/dashboard/circle',
        VILLAGE_OFF: '/dashboard/village',
        CITIZEN: '/dashboard/citizen',
      };

      return successResponse({
        ...officer,
        role: user.role,
        roleLevel: user.roleLevel,
        dashboardRoute: roleToDashboard[user.role] || '/dashboard/citizen',
        activeCases: caseCount.count,
        permissions: user.permissions,
      });
    }
  } finally {
    db.close();
  }
}
