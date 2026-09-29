import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, errorResponse, successResponse } from '@/lib/api/helpers';
import crypto from 'crypto';


export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  if (user.role !== 'CITIZEN') {
    return errorResponse('FORBIDDEN_ACTION', 'Only citizens can view their disputes here', 403);
  }

  const db = getDb();

  try {
    const disputes = await db.prepare(`
      SELECT d.*, p.parcel_uid, p.village, p.survey_number
      FROM land_disputes d
      JOIN parcels p ON d.parcel_id = p.id
      WHERE d.complainant_id = ?
      ORDER BY d.created_at DESC
    `).all(user.id);

    return successResponse({ disputes });
  } catch (error) {
    console.error('Error fetching disputes:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch disputes', 500);
  } finally {
    db.close();
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  if (user.role !== 'CITIZEN') {
    return errorResponse('FORBIDDEN_ACTION', 'Only citizens can file disputes', 403);
  }

  const db = getDb();

  try {
    const body = await req.json();
    const { parcelId, category, description } = body;

    if (!parcelId || !category || !description) {
      return errorResponse('VALIDATION_ERROR', 'Missing required fields', 400);
    }

    const parcel = await db.prepare('SELECT id FROM parcels WHERE id = ? AND current_owner_id = ?').get(parcelId, user.id);
    if (!parcel) {
      return errorResponse('NOT_FOUND', 'Parcel not found or you are not the owner', 404);
    }

    const now = new Date().toISOString();
    const disputeId = 'disp-' + crypto.randomUUID();
    const disputeUid = 'DSP-' + Date.now().toString().slice(-6) + '-' + Math.floor(Math.random() * 1000);

    await db.prepare(`
      INSERT INTO land_disputes (id, dispute_uid, parcel_id, complainant_id, category, description, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)
    `).run(disputeId, disputeUid, parcelId, user.id, category, description, now, now);

    return successResponse({
      message: 'Dispute filed successfully',
      disputeUid
    }, 201);
  } catch (error) {
    console.error('Error creating dispute:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to file dispute', 500);
  } finally {
    db.close();
  }
}
