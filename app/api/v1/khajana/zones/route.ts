import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, errorResponse, successResponse } from '@/lib/api/helpers';


export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const { user } = authResult;

  if (user.role !== 'CIRCLE_OFF' && user.role !== 'VILLAGE_OFF') {
    return errorResponse('FORBIDDEN_ACTION', 'Access restricted to Revenue Officers', 403);
  }

  const db = getDb();
  
  try {
    // For a circle officer, their jurisdiction is usually a CIRCLE.
    // We fetch all distinct villages inside that circle from the parcels table.
    
    // In a real system we'd join with jurisdictions table, but for now we can extract unique villages from parcels
    // where circle = user.jurisdiction_name. Or just get all distinct villages for demonstration.
    
    const zones = await db.prepare(`
      SELECT DISTINCT village as name, village as id
      FROM parcels
      WHERE village IS NOT NULL
      ORDER BY village ASC
    `).all();

    return successResponse({ zones });
  } catch (error: any) {
    console.error('Khajana Zones API Error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch zones');
  }
}
