// Bhoomisetu — Parcels API
// GET /api/v1/parcels/mine — citizen's owned parcels

import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, errorResponse, successResponse } from '@/lib/api/helpers';


export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const { user, requestId } = authResult;

  // Citizens see their own parcels; officers see jurisdiction-scoped
  const db = getDb();
  try {
    if (user.role === 'CITIZEN') {
      const parcels = await db.prepare(`
        SELECT p.id, p.parcel_uid, p.state, p.district, p.subdivision, p.tehsil, p.circle, p.village,
               p.survey_number, p.subdivision_number, p.patta_number, p.khatian_number,
               p.land_type, p.land_class, p.area_declared_sqm, p.area_computed_sqm,
               p.geometry, p.boundary_north, p.boundary_south, p.boundary_east, p.boundary_west,
               p.ownership_type, p.encumbrance_status, p.created_at,
               c.full_name as owner_name, c.citizen_uid as owner_uid
        FROM parcels p
        LEFT JOIN citizens c ON p.current_owner_id = c.id
        WHERE p.current_owner_id = (SELECT id FROM citizens WHERE citizen_uid = ?)
        ORDER BY p.village, p.survey_number
      `).all(user.uid);

      return successResponse({
        parcels,
        count: parcels.length,
        totalAreaSqm: parcels.reduce((sum: number, p: any) => sum + (p.area_declared_sqm || 0), 0),
      });
    } else {
      // Officers: jurisdiction-scoped parcels
      if (!user.jurisdictionPath) {
        return errorResponse('FORBIDDEN_ACTION', 'No jurisdiction assigned', 403, requestId);
      }

      const parcels = await db.prepare(`
        SELECT p.id, p.parcel_uid, p.state, p.district, p.village,
               p.survey_number, p.patta_number, p.land_type,
               p.area_declared_sqm, p.area_computed_sqm,
               p.ownership_type, p.encumbrance_status,
               c.full_name as owner_name
        FROM parcels p
        LEFT JOIN citizens c ON p.current_owner_id = c.id
        JOIN jurisdictions j ON p.jurisdiction_id = j.id
        WHERE j.path LIKE ?
        ORDER BY p.village, p.survey_number
      `).all(`${user.jurisdictionPath}%`);

      return successResponse({
        parcels,
        count: parcels.length,
      });
    }
  } finally {
    db.close();
  }
}
