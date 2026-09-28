import { NextRequest } from 'next/server';
import { getAuthUser, successResponse, errorResponse } from '@/lib/api/helpers';
import Database from 'better-sqlite3';
import path from 'path';

function getDb() {
  const DB_PATH = process.env.DATABASE_URL || path.join(process.cwd(), 'data', 'bhoomisetu.db');
  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
  return db;
}

export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  const db = getDb();

  try {
    const body = await req.json();
    const { parcel_id, category = 'BOUNDARY', description, complainant_id } = body;

    if (!parcel_id || !description || description.trim().length < 10) {
      return errorResponse('VALIDATION_ERROR', 'Parcel ID and a descriptive reason (at least 10 characters) are required.', 400);
    }

    // Check parcel
    const parcel = db.prepare('SELECT id, parcel_uid, current_owner_id FROM parcels WHERE id = ?').get(parcel_id) as any;
    if (!parcel) {
      return errorResponse('NOT_FOUND', 'Parcel not found.', 404);
    }

    // Determine complainant ID
    let finalComplainantId = complainant_id;
    if (!finalComplainantId && user) {
      const citizen = db.prepare('SELECT id FROM citizens WHERE citizen_uid = ?').get(user.uid) as any;
      finalComplainantId = citizen?.id;
    }
    if (!finalComplainantId) {
      // Pick first citizen as default complainant if guest
      const anyCitizen = db.prepare('SELECT id FROM citizens WHERE id != ? LIMIT 1').get(parcel.current_owner_id || '') as any;
      finalComplainantId = anyCitizen?.id || parcel.current_owner_id;
    }

    const id = `disp-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const disputeUid = `DSP-${Date.now().toString().slice(-6)}`;
    const now = new Date().toISOString();

    // Insert dispute
    db.prepare(`
      INSERT INTO land_disputes (
        id, dispute_uid, parcel_id, complainant_id, category,
        description, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'OPEN', ?, ?)
    `).run(
      id,
      disputeUid,
      parcel.id,
      finalComplainantId,
      category,
      description,
      now,
      now
    );

    // Update parcel encumbrance status to DISPUTED
    db.prepare(`
      UPDATE parcels
      SET encumbrance_status = 'DISPUTED', updated_at = ?
      WHERE id = ?
    `).run(now, parcel.id);

    // Log to audit log
    db.prepare(`
      INSERT INTO audit_log (
        actor_id, actor_type, actor_role_code,
        action, entity_type, entity_id, previous_status, new_status,
        reason, metadata, ip_address, created_at
      ) VALUES (?, ?, ?, 'RECORD_MAP_DISPUTE', 'PARCEL', ?, 'CLEAR', 'DISPUTED', ?, ?, '127.0.0.1', ?)
    `).run(
      user?.uid || 'GIS_MAP_USER',
      user ? (user.role === 'CITIZEN' ? 'CITIZEN' : 'OFFICER') : 'SYSTEM',
      user?.role || 'SYSTEM',
      parcel.id,
      `Recorded land dispute (${category}) from GIS GeoPortal: ${description}`,
      JSON.stringify({ disputeUid, category }),
      now
    );

    return successResponse({
      message: 'Dispute recorded and parcel marked as DISPUTED on GIS map.',
      dispute: {
        id,
        dispute_uid: disputeUid,
        parcel_id: parcel.id,
        category,
        status: 'OPEN',
      },
    }, 201);
  } catch (error: any) {
    console.error('Error recording dispute from map:', error);
    return errorResponse('INTERNAL_ERROR', error.message, 500);
  } finally {
    db.close();
  }
}
