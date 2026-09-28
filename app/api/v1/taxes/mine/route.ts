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
  const { user } = authResult;

  if (user.role !== 'CITIZEN') {
    return errorResponse('FORBIDDEN_ACTION', 'Only citizens can view their taxes', 403);
  }

  const db = getDb();

  try {
    const taxes = db.prepare(`
      SELECT t.*, p.parcel_uid, p.village, p.survey_number, p.land_type, c.full_name as owner_name, t.payment_mode
      FROM land_taxes t
      JOIN parcels p ON t.parcel_id = p.id
      JOIN citizens c ON t.citizen_id = c.id
      WHERE c.citizen_uid = ?
      ORDER BY t.created_at DESC
    `).all(user.id);

    return successResponse({ taxes });
  } catch (error) {
    console.error('Error fetching taxes:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch taxes', 500);
  } finally {
    db.close();
  }
}
