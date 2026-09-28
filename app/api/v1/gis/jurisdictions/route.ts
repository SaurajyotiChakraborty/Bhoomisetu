import { NextRequest } from 'next/server';
import { successResponse, errorResponse } from '@/lib/api/helpers';
import Database from 'better-sqlite3';
import path from 'path';

function getDb() {
  const DB_PATH = process.env.DATABASE_URL || path.join(process.cwd(), 'data', 'bhoomisetu.db');
  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
  return db;
}

export async function GET(req: NextRequest) {
  const db = getDb();
  try {
    const jurisdictions = db.prepare(`
      SELECT id, code, name, type, parent_id, path, geometry
      FROM jurisdictions
      ORDER BY type, name
    `).all();

    return successResponse({ jurisdictions });
  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error.message, 500);
  } finally {
    db.close();
  }
}
