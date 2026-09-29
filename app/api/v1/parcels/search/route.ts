import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, errorResponse, successResponse } from '@/lib/api/helpers';


export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  if (user.role !== 'CITIZEN') {
    return errorResponse('FORBIDDEN_ACTION', 'Only citizens can use the land search feature', 403);
  }

  const { searchParams } = new URL(req.url);
  const uid = searchParams.get('uid');

  if (!uid) {
    return errorResponse('VALIDATION_ERROR', 'Unique Land ID (parcel_uid) is required', 400);
  }

  const db = getDb();

  try {
    // 1. Fetch Parcel and Current Owner
    const parcel = await db.prepare(`
      SELECT p.*, c.full_name as owner_name, c.email as owner_email, c.mobile as owner_mobile, c.citizen_uid as owner_uid
      FROM parcels p
      LEFT JOIN citizens c ON p.current_owner_id = c.id
      WHERE p.parcel_uid = ?
    `).get(uid) as any;

    if (!parcel) {
      return errorResponse('NOT_FOUND', 'Land record not found. Please verify the Unique Land ID.', 404);
    }

    // Never leak counterparty PII (Invariant 12)
    const isOwner = user.uid === parcel.owner_uid;
    const safeParcel = {
      ...parcel,
      owner_email: isOwner ? parcel.owner_email : undefined,
      owner_mobile: isOwner ? parcel.owner_mobile : undefined,
      owner_uid: isOwner ? parcel.owner_uid : (parcel.owner_uid ? parcel.owner_uid.slice(0, 12) + '****' + parcel.owner_uid.slice(-4) : undefined),
    };

    // 2. Fetch Disputes for this parcel
    const disputes = await db.prepare(`
      SELECT category, status, description, created_at, resolution_notes
      FROM land_disputes
      WHERE parcel_id = ?
      ORDER BY created_at DESC
    `).all(parcel.id);

    // 3. Fetch Ownership History (Chain of Title)
    const history = await db.prepare(`
      SELECT h.*, 
             from_c.full_name as from_owner_name, 
             to_c.full_name as to_owner_name
      FROM ownership_history h
      LEFT JOIN citizens from_c ON h.from_owner_id = from_c.id
      LEFT JOIN citizens to_c ON h.to_owner_id = to_c.id
      WHERE h.parcel_id = ?
      ORDER BY h.transfer_date DESC
    `).all(parcel.id);

    return successResponse({
      parcel: safeParcel,
      disputes,
      history
    });
  } catch (error) {
    console.error('Error in land search:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to perform land search', 500);
  } finally {
    db.close();
  }
}
