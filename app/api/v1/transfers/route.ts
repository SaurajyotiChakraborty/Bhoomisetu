// Bhoomisetu — Create Transfer Application (§8.2 Stage 1)
// POST /api/v1/transfers

import { NextRequest } from 'next/server';
import { createTransferSchema } from '@/lib/validations/schemas';
import { requireAuth, errorResponse, successResponse, createRequestId } from '@/lib/api/helpers';
import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';

function getDb() {
  const DB_PATH = process.env.DATABASE_URL || path.join(process.cwd(), 'data', 'bhoomisetu.db');
  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
  return db;
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const { user, requestId } = authResult;

  // Only citizens can create transfers
  if (user.role !== 'CITIZEN') {
    return errorResponse('FORBIDDEN_ACTION', 'Only citizens can create transfer applications', 403, requestId);
  }

  try {
    const body = await req.json();
    const result = createTransferSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('VALIDATION_ERROR', result.error.errors.map(e => e.message).join(', '), 400, requestId);
    }

    const data = result.data;
    const db = getDb();

    try {
      // Verify parcel exists and belongs to the seller
      const parcel = db.prepare(`
        SELECT p.id, p.parcel_uid, p.current_owner_id, p.encumbrance_status, p.is_locked,
               c.citizen_uid as owner_uid
        FROM parcels p
        JOIN citizens c ON p.current_owner_id = c.id
        WHERE p.id = ?
      `).get(data.parcelId) as any;

      if (!parcel) {
        return errorResponse('NOT_FOUND', 'Parcel not found', 404, requestId);
      }

      let sellerUid = parcel.owner_uid;
      let buyerUid = data.buyerCitizenUid;

      // If the initiator is NOT the owner, they must be requesting to buy it themselves
      if (parcel.owner_uid !== user.uid) {
        if (data.buyerCitizenUid !== user.uid) {
           return errorResponse('FORBIDDEN_ACTION', 'You can only transfer parcels you own, or request to buy them for yourself', 403, requestId);
        }
        buyerUid = user.uid;
      }

      if (parcel.encumbrance_status === 'DISPUTED') {
        return errorResponse('VALIDATION_ERROR', 'Cannot transfer a disputed parcel', 400, requestId);
      }

      // Verify buyer exists
      const buyer = db.prepare(
        'SELECT id, citizen_uid, full_name, email FROM citizens WHERE citizen_uid = ? OR id = ?'
      ).get(buyerUid, buyerUid) as any;

      if (!buyer) {
        return errorResponse('NOT_FOUND', 'Buyer not found', 404, requestId);
      }

      if (buyer.citizen_uid === sellerUid) {
        return errorResponse('VALIDATION_ERROR', 'Cannot transfer to yourself', 400, requestId);
      }

      // Check for existing active transfer on this parcel
      const existingTransfer = db.prepare(`
        SELECT id FROM transfers WHERE parcel_id = ? AND status NOT IN ('TRANSFER_COMPLETED', 'REJECTED', 'CANCELLED_BY_APPLICANT', 'COUNTERPARTY_DECLINED')
      `).get(data.parcelId) as any;

      if (existingTransfer) {
        return errorResponse('CONFLICT', 'An active transfer already exists for this parcel', 409, requestId);
      }

      // Generate application UID
      const year = new Date().getFullYear();
      const lastTransfer = db.prepare(
        "SELECT application_uid FROM transfers WHERE application_uid LIKE ? ORDER BY application_uid DESC LIMIT 1"
      ).get(`LTA-${year}-%`) as { application_uid: string } | undefined;

      let nextNum = 1;
      if (lastTransfer) {
        const parts = lastTransfer.application_uid.split('-');
        nextNum = parseInt(parts[2], 10) + 1;
      }
      const applicationUid = `LTA-${year}-${String(nextNum).padStart(8, '0')}`;

      const id = crypto.randomUUID();
      const now = new Date().toISOString();
      const seller = db.prepare('SELECT id FROM citizens WHERE citizen_uid = ?').get(sellerUid) as any;

      db.prepare(`
        INSERT INTO transfers (id, application_uid, parcel_id, seller_id, buyer_id,
          transfer_type, consideration_amount, status, is_partial_transfer,
          partial_area, partial_geometry, handshake_attempts, handshake_resends_used,
          created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'BUYER_REQUEST_PENDING', ?, ?, ?, 0, 0, ?, ?)
      `).run(
        id, applicationUid, data.parcelId, seller.id, buyer.id,
        data.transferType, data.considerationAmount || 0,
        data.isPartialTransfer ? 1 : 0,
        data.partialArea || null, data.partialGeometry || null,
        now, now
      );

      console.log(`📝 Transfer created: ${applicationUid} | ${parcel.parcel_uid} | ${user.uid} → ${buyer.citizen_uid}`);

      return successResponse({
        message: 'Transfer application created',
        applicationUid,
        id,
        status: 'BUYER_REQUEST_PENDING',
      }, 201);
    } finally {
      db.close();
    }
  } catch (error) {
    console.error('Transfer creation error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to create transfer', 500, requestId);
  }
}

// GET /api/v1/transfers — list all (alias for queue)
export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const { user } = authResult;
  const db = getDb();

  try {
    if (user.role === 'CITIZEN') {
      const transfers = db.prepare(`
        SELECT t.id, t.application_uid, t.transfer_type, t.consideration_amount, t.status,
               t.created_at, t.updated_at,
               p.parcel_uid, p.village, p.survey_number, p.land_type, p.area_declared_sqm,
               p.encumbrance_status, p.boundary_north, p.boundary_south, p.boundary_east, p.boundary_west,
               seller.full_name as seller_name, seller.citizen_uid as seller_uid,
               seller.mobile as seller_mobile, seller.email as seller_email,
               buyer.full_name as buyer_name, buyer.citizen_uid as buyer_uid,
               buyer.mobile as buyer_mobile, buyer.email as buyer_email
        FROM transfers t
        JOIN parcels p ON t.parcel_id = p.id
        JOIN citizens seller ON t.seller_id = seller.id
        JOIN citizens buyer ON t.buyer_id = buyer.id
        WHERE seller.citizen_uid = ? OR buyer.citizen_uid = ?
        ORDER BY t.updated_at DESC
      `).all(user.uid, user.uid);

      return successResponse({ transfers, count: transfers.length });
    } else {
      const transfers = db.prepare(`
        SELECT t.id, t.application_uid, t.transfer_type, t.consideration_amount, t.status,
               t.created_at, t.updated_at,
               p.parcel_uid, p.village, p.survey_number, p.land_type, p.area_declared_sqm,
               seller.full_name as seller_name,
               buyer.full_name as buyer_name
        FROM transfers t
        JOIN parcels p ON t.parcel_id = p.id
        JOIN citizens seller ON t.seller_id = seller.id
        JOIN citizens buyer ON t.buyer_id = buyer.id
        JOIN jurisdictions j ON p.jurisdiction_id = j.id
        WHERE j.path LIKE ?
        ORDER BY t.updated_at DESC
      `).all(`${user.jurisdictionPath || ''}%`);

      return successResponse({ transfers, count: transfers.length });
    }
  } finally {
    db.close();
  }
}
