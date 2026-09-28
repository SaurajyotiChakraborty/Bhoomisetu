import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/lib/api/helpers';
import Database from 'better-sqlite3';
import path from 'path';

function getDb() {
  const DB_PATH = process.env.DATABASE_URL || path.join(process.cwd(), 'data', 'bhoomisetu.db');
  return new Database(DB_PATH);
}

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  if (user.role !== 'DIV_COMM') {
    return errorResponse('FORBIDDEN_ACTION', 'Access restricted to Division Commissioner', 403);
  }

  const db = getDb();
  
  try {
    const districtStats = db.prepare(`
      SELECT p.district, SUM(t.total_outstanding) as total_outstanding, SUM(t.base_liability) as total_liability,
             SUM(CASE WHEN t.status = 'PAID' THEN t.base_liability ELSE 0 END) as collected
      FROM land_taxes t
      JOIN parcels p ON t.parcel_id = p.id
      GROUP BY p.district
    `).all();

    return successResponse({ stats: districtStats });
  } catch (error: any) {
    console.error('Division Stats API Error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch division stats');
  }
}
