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

  if (user.role !== 'CIRCLE_OFF' && user.role !== 'VILLAGE_OFF') {
    return errorResponse('FORBIDDEN_ACTION', 'Access restricted to Revenue Officers', 403);
  }

  const url = new URL(req.url);
  const zone = url.searchParams.get('zone');
  const search = url.searchParams.get('search');

  const db = getDb();
  
  try {
    let parcels = [];

    // Base query that joins with citizens to get owner details and land_taxes to get khajana info
    let query = `
      SELECT p.*, 
             c.full_name as owner_name, 
             c.citizen_uid as owner_uid_masked,
             t.id as tax_id,
             t.base_liability,
             t.accumulated_arrears,
             t.late_surcharges,
             t.total_outstanding,
             t.status as standing_status,
             t.payment_mode
      FROM parcels p
      LEFT JOIN citizens c ON p.current_owner_id = c.id
      LEFT JOIN land_taxes t ON t.parcel_id = p.id
    `;
    
    let params: any[] = [];

    if (zone && search) {
      query += ` WHERE p.village = ? AND (p.parcel_uid LIKE ? OR p.survey_number LIKE ? OR p.patta_number LIKE ? OR c.full_name LIKE ?)`;
      const searchParam = `%${search}%`;
      params = [zone, searchParam, searchParam, searchParam, searchParam];
    } else if (search) {
      query += ` WHERE p.parcel_uid LIKE ? OR p.survey_number LIKE ? OR p.patta_number LIKE ? OR c.full_name LIKE ?`;
      const searchParam = `%${search}%`;
      params = [searchParam, searchParam, searchParam, searchParam];
    } else if (zone) {
      query += ` WHERE p.village = ?`;
      params = [zone];
    } else {
      // Empty state enforcement
      return successResponse({ parcels: [] });
    }

    query += ` ORDER BY p.parcel_uid ASC LIMIT 500`;

    const rawParcels = db.prepare(query).all(...params);

    parcels = rawParcels.map((p: any) => {
      return {
        ...p,
        tax_ledger: {
          current_year_liability: p.base_liability,
          accumulated_arrears: p.accumulated_arrears,
          late_surcharges: p.late_surcharges,
          total_outstanding: p.total_outstanding
        }
      };
    });

    return successResponse({ parcels });
  } catch (error: any) {
    console.error('Khajana API Error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch land tax registry');
  }
}
