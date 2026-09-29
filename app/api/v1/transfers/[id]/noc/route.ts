// Bhoomisetu — NOC Signing API
// GET  /api/v1/transfers/[id]/noc — View NOC status & signatures
// POST /api/v1/transfers/[id]/noc — Sign the NOC

import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, errorResponse, successResponse } from '@/lib/api/helpers';
import crypto from 'crypto';
import { computeSHA256 } from '@/lib/auth/encryption';


export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const { id } = await params;
  const db = getDb();

  try {
    // Fetch transfer with parcel + party details
    const transfer = await db.prepare(`
      SELECT t.id, t.application_uid, t.status, t.transfer_type, t.consideration_amount,
             p.parcel_uid, p.village, p.survey_number, p.land_type, p.area_declared_sqm,
             p.boundary_north, p.boundary_south, p.boundary_east, p.boundary_west,
             p.ownership_type, p.current_owner_id,
             seller.full_name as seller_name, seller.citizen_uid as seller_uid,
             seller.mobile as seller_mobile, seller.email as seller_email,
             buyer.full_name as buyer_name, buyer.citizen_uid as buyer_uid,
             buyer.mobile as buyer_mobile, buyer.email as buyer_email
      FROM transfers t
      JOIN parcels p ON t.parcel_id = p.id
      JOIN citizens seller ON t.seller_id = seller.id
      JOIN citizens buyer ON t.buyer_id = buyer.id
      WHERE t.id = ? OR t.application_uid = ?
    `).get(id, id) as any;

    if (!transfer) {
      return errorResponse('NOT_FOUND', 'Transfer not found', 404);
    }

    // Fetch existing NOC signatures
    const signatures = await db.prepare(`
      SELECT ns.*, c.full_name as signer_name, c.citizen_uid as signer_uid
      FROM noc_signatures ns
      JOIN citizens c ON ns.signer_id = c.id
      WHERE ns.transfer_id = ?
      ORDER BY ns.created_at ASC
    `).all(transfer.id);

    // Determine required signers
    const requiredSigners: { id: string; name: string; role: string; uid: string }[] = [];

    // Seller is always required
    const seller = await db.prepare('SELECT id, full_name, citizen_uid FROM citizens WHERE citizen_uid = ?').get(transfer.seller_uid) as any;
    requiredSigners.push({ id: seller.id, name: seller.full_name, role: 'SELLER', uid: seller.citizen_uid });

    // Buyer is always required
    const buyer = await db.prepare('SELECT id, full_name, citizen_uid FROM citizens WHERE citizen_uid = ?').get(transfer.buyer_uid) as any;
    requiredSigners.push({ id: buyer.id, name: buyer.full_name, role: 'BUYER', uid: buyer.citizen_uid });

    // If JOINT ownership, fetch all co-owners of this parcel (excluding seller who is already listed)
    if (transfer.ownership_type === 'JOINT') {
      const coOwners = await db.prepare(`
        SELECT c.id, c.full_name, c.citizen_uid
        FROM parcels p2
        JOIN citizens c ON p2.current_owner_id = c.id
        WHERE p2.parcel_uid = ? AND c.citizen_uid != ?
      `).all(transfer.parcel_uid, transfer.seller_uid) as any[];

      for (const co of coOwners) {
        requiredSigners.push({ id: co.id, name: co.full_name, role: 'CO_OWNER', uid: co.citizen_uid });
      }
    }

    // Build signature status
    const signatureStatus = requiredSigners.map(rs => {
      const sig = (signatures as any[]).find(s => s.signer_id === rs.id);
      return {
        signerId: rs.id,
        signerName: rs.name,
        signerUid: rs.uid,
        role: rs.role,
        signed: !!sig?.signed_at,
        signedAt: sig?.signed_at || null,
      };
    });

    const allSigned = signatureStatus.every(s => s.signed);
    const totalRequired = signatureStatus.length;
    const totalSigned = signatureStatus.filter(s => s.signed).length;

    return successResponse({
      transfer,
      signatureStatus,
      allSigned,
      totalRequired,
      totalSigned,
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

  const { user } = authResult;
  const { id } = await params;

  if (user.role !== 'CITIZEN') {
    return errorResponse('FORBIDDEN_ACTION', 'Only citizens can sign the NOC', 403);
  }

  const db = getDb();

  try {
    // Fetch the transfer
    const transfer = await db.prepare(`
      SELECT t.*, p.ownership_type, p.parcel_uid,
             seller.citizen_uid as seller_uid, seller.id as seller_db_id,
             buyer.citizen_uid as buyer_uid, buyer.id as buyer_db_id
      FROM transfers t
      JOIN parcels p ON t.parcel_id = p.id
      JOIN citizens seller ON t.seller_id = seller.id
      JOIN citizens buyer ON t.buyer_id = buyer.id
      WHERE t.id = ? OR t.application_uid = ?
    `).get(id, id) as any;

    if (!transfer) {
      return errorResponse('NOT_FOUND', 'Transfer not found', 404);
    }

    if (transfer.status !== 'MUTUAL_TOC_PENDING_SIGNATURES') {
      return errorResponse('VALIDATION_ERROR', 'Mutual TOC signing is only available when status is MUTUAL_TOC_PENDING_SIGNATURES', 400);
    }

    // Get this citizen's DB id
    const citizen = await db.prepare('SELECT id FROM citizens WHERE citizen_uid = ?').get(user.uid) as any;
    if (!citizen) {
      return errorResponse('NOT_FOUND', 'Citizen not found', 404);
    }

    // Determine role
    let signerRole = '';
    if (user.uid === transfer.seller_uid) {
      signerRole = 'SELLER';
    } else if (user.uid === transfer.buyer_uid) {
      signerRole = 'BUYER';
    } else {
      // Check if co-owner
      signerRole = 'CO_OWNER';
    }

    // Check if already signed
    const existingSig = await db.prepare(
      'SELECT id FROM noc_signatures WHERE transfer_id = ? AND signer_id = ? AND signed_at IS NOT NULL'
    ).get(transfer.id, citizen.id) as any;

    if (existingSig) {
      return errorResponse('CONFLICT', 'You have already signed this NOC', 409);
    }

    const now = new Date().toISOString();
    const signatureHash = crypto.createHash('sha256').update(`${transfer.id}:${citizen.id}:${now}:NOC_SIGN`).digest('hex');
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';

    // Upsert: create or update the signature record
    const existing = await db.prepare(
      'SELECT id FROM noc_signatures WHERE transfer_id = ? AND signer_id = ?'
    ).get(transfer.id, citizen.id) as any;

    if (existing) {
      await db.prepare(
        'UPDATE noc_signatures SET signed_at = ?, signature_hash = ?, ip_address = ? WHERE id = ?'
      ).run(now, signatureHash, ip, existing.id);
    } else {
      const sigId = crypto.randomUUID();
      await db.prepare(
        'INSERT INTO noc_signatures (id, transfer_id, signer_id, signer_role, signed_at, signature_hash, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
      ).run(sigId, transfer.id, citizen.id, signerRole, now, signatureHash, ip, now);
    }

    // Check if ALL required parties have now signed
    // Required: seller + buyer + co-owners (if JOINT)
    const requiredSignerIds: string[] = [transfer.seller_db_id, transfer.buyer_db_id];

    if (transfer.ownership_type === 'JOINT') {
      const coOwners = await db.prepare(`
        SELECT c.id FROM parcels p2
        JOIN citizens c ON p2.current_owner_id = c.id
        WHERE p2.parcel_uid = ? AND c.id != ?
      `).all(transfer.parcel_uid, transfer.seller_db_id) as any[];
      for (const co of coOwners) {
        requiredSignerIds.push(co.id);
      }
    }

    const signedCount = await db.prepare(`
      SELECT COUNT(*) as cnt FROM noc_signatures
      WHERE transfer_id = ? AND signed_at IS NOT NULL AND signer_id IN (${requiredSignerIds.map(() => '?').join(',')})
    `).get(transfer.id, ...requiredSignerIds) as any;

    const allSigned = signedCount.cnt >= requiredSignerIds.length;

    if (allSigned) {
      // Auto-transition: MUTUAL_TOC_PENDING_SIGNATURES → MUTUAL_TOC_SIGNED
      await db.prepare('UPDATE transfers SET status = ?, updated_at = ? WHERE id = ?')
        .run('MUTUAL_TOC_SIGNED', now, transfer.id);

      // Audit log
      const nocChainPayload = JSON.stringify({ actor: user.uid, action: 'MUTUAL_TOC_ALL_SIGNED', entity: transfer.application_uid, at: now });
      const nocChainHash = computeSHA256(nocChainPayload);
      await db.prepare(`
        INSERT INTO audit_log (actor_id, actor_type, actor_role_code, actor_jurisdiction_id,
          action, entity_type, entity_id, previous_status, new_status, reason,
          ip_address, chain_hash, created_at)
        VALUES (?, 'CITIZEN', 'CITIZEN', NULL, 'MUTUAL_TOC_ALL_SIGNED', 'TRANSFER', ?, 'MUTUAL_TOC_PENDING_SIGNATURES', 'MUTUAL_TOC_SIGNED', 'All Mutual TOC signatures collected. Forwarded to Circle Officer Queue.', ?, ?, ?)
      `).run(user.uid, transfer.application_uid, ip, nocChainHash, now);

      return successResponse({
        message: 'Mutual TOC signed! All signatures collected — forwarded to Circle Officer.',
        allSigned: true,
        newStatus: 'MUTUAL_TOC_SIGNED',
      });
    }

    return successResponse({
      message: 'NOC signed successfully. Waiting for remaining signatures.',
      allSigned: false,
      signedCount: signedCount.cnt,
      requiredCount: requiredSignerIds.length,
    });
  } catch (error) {
    console.error('NOC signing error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to sign NOC', 500);
  } finally {
    db.close();
  }
}
