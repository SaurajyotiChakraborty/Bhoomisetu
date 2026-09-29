import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { successResponse, errorResponse } from '@/lib/api/helpers';


export async function GET(req: NextRequest) {
  const db = getDb();
  try {
    const jurisdictions = await db.prepare(`
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
