// Bhoomisetu — Transfer Detail & Actions
// GET /api/v1/transfers/[id] — view detail
// POST /api/v1/transfers/[id] — perform action (accept, decline, forward, etc.)

import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse, createRequestId } from '@/lib/api/helpers';
import { TransferStateMachine } from '@/lib/state-machine/transfer-state-machine';
import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';
import type { TransferStatus } from '@/lib/types';

function getDb() {
  const DB_PATH = process.env.DATABASE_URL || path.join(process.cwd(), 'data', 'bhoomisetu.db');
  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
  return db;
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const { user, requestId } = authResult;
  const { id } = await params;
  const db = getDb();

  try {
    const transfer = db.prepare(`
      SELECT t.*,
             p.parcel_uid, p.village, p.survey_number, p.land_type, p.area_declared_sqm,
             p.area_computed_sqm, p.geometry, p.encumbrance_status,
             seller.full_name as seller_name, seller.citizen_uid as seller_uid, seller.email as seller_email,
             buyer.full_name as buyer_name, buyer.citizen_uid as buyer_uid, buyer.email as buyer_email,
             j.path as jurisdiction_path
      FROM transfers t
      JOIN parcels p ON t.parcel_id = p.id
      JOIN citizens seller ON t.seller_id = seller.id
      JOIN citizens buyer ON t.buyer_id = buyer.id
      JOIN jurisdictions j ON p.jurisdiction_id = j.id
      WHERE t.id = ? OR t.application_uid = ?
    `).get(id, id) as any;

    if (!transfer) {
      return errorResponse('NOT_FOUND', 'Transfer not found', 404, requestId);
    }

    // Build available actions for the current user
    const appForSM = {
      id: transfer.id,
      status: transfer.status as TransferStatus,
      sellerId: transfer.seller_uid,
      buyerId: transfer.buyer_uid,
      parcelId: transfer.parcel_id,
      heldFromStatus: transfer.held_from_status,
      handshakeAttempts: transfer.handshake_attempts || 0,
      handshakeResendsUsed: transfer.handshake_resends_used || 0,
    };

    const validTransitions = TransferStateMachine.getValidTransitions(appForSM, user);

    // Get timeline from audit log
    const timeline = db.prepare(`
      SELECT action, previous_status, new_status, reason, created_at,
             actor_id, actor_role_code
      FROM audit_log
      WHERE entity_type = 'TRANSFER' AND entity_id = ?
      ORDER BY created_at ASC
    `).all(transfer.application_uid);

    return successResponse({
      transfer,
      validTransitions,
      timeline,
    });
  } finally {
    db.close();
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const { user, requestId } = authResult;
  const { id } = await params;
  const db = getDb();

  try {
    const body = await req.json();
    const { action, reason } = body as { action: TransferStatus; reason?: string };

    if (!action) {
      return errorResponse('VALIDATION_ERROR', 'Action (target status) is required', 400, requestId);
    }

    const transfer = db.prepare(`
      SELECT t.*, seller.citizen_uid as seller_uid, buyer.citizen_uid as buyer_uid,
             j.path as jurisdiction_path
      FROM transfers t
      JOIN citizens seller ON t.seller_id = seller.id
      JOIN citizens buyer ON t.buyer_id = buyer.id
      JOIN parcels p ON t.parcel_id = p.id
      JOIN jurisdictions j ON p.jurisdiction_id = j.id
      WHERE t.id = ? OR t.application_uid = ?
    `).get(id, id) as any;

    if (!transfer) {
      return errorResponse('NOT_FOUND', 'Transfer not found', 404, requestId);
    }

    // Use the state machine — THE ONLY way to change status
    const appForSM = {
      id: transfer.id,
      status: transfer.status as TransferStatus,
      sellerId: transfer.seller_uid,
      buyerId: transfer.buyer_uid,
      parcelId: transfer.parcel_id,
      heldFromStatus: transfer.held_from_status,
      handshakeAttempts: transfer.handshake_attempts || 0,
      handshakeResendsUsed: transfer.handshake_resends_used || 0,
    };

    const transitionResult = TransferStateMachine.transition(
      appForSM,
      action,
      user,
      transfer.jurisdiction_path
    );

    if (!transitionResult.success) {
      return errorResponse(
        transitionResult.error!.code as any,
        transitionResult.error!.message,
        transitionResult.error!.code === 'OUT_OF_JURISDICTION' ? 403 : 400,
        requestId
      );
    }

    // Check if reason is required
    if (TransferStateMachine.requiresReason(transfer.status, action) && !reason) {
      return errorResponse('VALIDATION_ERROR', 'Reason is required for this action', 400, requestId);
    }

    const now = new Date().toISOString();
    const previousStatus = transfer.status;

    const executeTransaction = db.transaction(() => {
      // Special handling for ON_HOLD (store previous status)
      if (action === 'ON_HOLD') {
        db.prepare('UPDATE transfers SET status = ?, held_from_status = ?, updated_at = ? WHERE id = ?')
          .run(action, previousStatus, now, transfer.id);
      } else if (action === 'TRANSFER_COMPLETED') {
        db.prepare('UPDATE transfers SET status = ?, updated_at = ?, completed_at = ? WHERE id = ?')
          .run(action, now, now, transfer.id);
          
        db.prepare('UPDATE parcels SET current_owner_id = ?, updated_at = ? WHERE id = ?')
          .run(transfer.buyer_id, now, transfer.parcel_id);
          
        const historyId = 'hist-' + crypto.randomUUID();
        db.prepare(`
          INSERT INTO ownership_history (id, parcel_id, from_owner_id, to_owner_id, transfer_type, transfer_date, application_id, approving_officer_id, consideration, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          historyId, transfer.parcel_id, transfer.seller_id, transfer.buyer_id, 
          transfer.transfer_type, now, transfer.id, user.id, transfer.consideration_amount || 0, now
        );
      } else {
        db.prepare('UPDATE transfers SET status = ?, updated_at = ? WHERE id = ?')
          .run(action, now, transfer.id);
      }

      // Audit
      db.prepare(`
        INSERT INTO audit_log (actor_id, actor_type, actor_role_code, actor_jurisdiction_id,
          action, entity_type, entity_id, previous_status, new_status, reason,
          ip_address, chain_hash, created_at)
        VALUES (?, ?, ?, ?, ?, 'TRANSFER', ?, ?, ?, ?, ?, ?, ?)
      `).run(
        user.uid,
        user.role === 'CITIZEN' ? 'CITIZEN' : 'OFFICER',
        user.role,
        user.jurisdictionId,
        `TRANSFER_${action}`,
        transfer.application_uid,
        previousStatus,
        action,
        reason || null,
        req.headers.get('x-forwarded-for') || '127.0.0.1',
        'dev-chain',
        now
      );
    });

    executeTransaction();

    console.log(`🔄 Transfer ${transfer.application_uid}: ${previousStatus} → ${action} by ${user.uid} (${user.role})`);

    return successResponse({
      message: `Transfer status updated to ${action}`,
      applicationUid: transfer.application_uid,
      previousStatus,
      newStatus: action,
    });
  } catch (error) {
    console.error('Transfer action error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to update transfer', 500, requestId);
  } finally {
    db.close();
  }
}
