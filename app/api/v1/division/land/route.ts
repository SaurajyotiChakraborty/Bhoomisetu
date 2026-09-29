import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, errorResponse, successResponse } from '@/lib/api/helpers';


export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  if (user.role !== 'DIV_COMM') {
    return errorResponse('FORBIDDEN_ACTION', 'Access restricted to Division Commissioner', 403);
  }

  const url = new URL(req.url);
  const district = url.searchParams.get('district');
  const circle = url.searchParams.get('circle');
  const village = url.searchParams.get('village');

  const db = getDb();
  
  try {
    if (village) {
      // Fetch parcels for village
      const parcels = await db.prepare(`
        SELECT p.*, c.full_name as owner_name, c.citizen_uid as owner_uid_masked
        FROM parcels p
        LEFT JOIN citizens c ON p.current_owner_id = c.id
        WHERE p.village = ?
      `).all(village);
      return successResponse({ data: parcels, type: 'parcels' });
    } else if (circle) {
      // Fetch villages for circle
      const villages = await db.prepare(`
        SELECT DISTINCT village as name FROM parcels WHERE circle = ? AND village IS NOT NULL
      `).all(circle);
      return successResponse({ data: villages.map((v: any) => v.name), type: 'villages' });
    } else if (district) {
      // Fetch circles for district
      const circles = await db.prepare(`
        SELECT DISTINCT circle as name FROM parcels WHERE district = ? AND circle IS NOT NULL
      `).all(district);
      return successResponse({ data: circles.map((c: any) => c.name), type: 'circles' });
    } else {
      // Fetch districts
      const districts = await db.prepare(`
        SELECT DISTINCT district as name FROM parcels WHERE district IS NOT NULL
      `).all();
      return successResponse({ data: districts.map((d: any) => d.name), type: 'districts' });
    }
  } catch (error: any) {
    console.error('Division Land API Error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch land records');
  }
}
