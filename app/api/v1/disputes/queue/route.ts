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

  if (user.role === 'CITIZEN') {
    return errorResponse('FORBIDDEN_ACTION', 'Citizens cannot access the queue', 403);
  }

  const db = getDb();

  try {
    const disputes = db.prepare(`
      SELECT d.*, p.parcel_uid, p.village, p.survey_number, c.full_name as complainant_name,
             j.path as jurisdiction_path
      FROM land_disputes d
      JOIN parcels p ON d.parcel_id = p.id
      JOIN citizens c ON d.complainant_id = c.id
      JOIN jurisdictions j ON p.jurisdiction_id = j.id
      WHERE j.path LIKE ?
      ORDER BY d.created_at DESC
    `).all(user.jurisdictionPath + '%');

    return successResponse({ disputes });
  } catch (error) {
    console.error('Error fetching dispute queue:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch dispute queue', 500);
  } finally {
    db.close();
  }
}
