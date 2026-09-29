import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api/helpers';


export async function GET(req: NextRequest) {
  const db = getDb();
  try {
    const citizens = await db.prepare(`
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
