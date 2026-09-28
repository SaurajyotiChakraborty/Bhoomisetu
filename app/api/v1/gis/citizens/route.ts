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
    const citizens = db.prepare(`
      SELECT id, citizen_uid, full_name, village_town, district
      FROM citizens
      WHERE status = 'ACTIVE'
      ORDER BY full_name
      LIMIT 100
    `).all();

    return successResponse({ citizens });
  } catch (error: any) {
    return errorResponse('INTERNAL_ERROR', error.message, 500);
  } finally {
    db.close();
  }
}
