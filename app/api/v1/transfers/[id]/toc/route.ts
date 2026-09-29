import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, errorResponse, successResponse } from '@/lib/api/helpers';
import { TransferStateMachine } from '@/lib/state-machine/transfer-state-machine';


// Get TOC status and pre-filled data
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  const db = getDb();

  try {
    const transfer = await db.prepare('SELECT * FROM transfers WHERE id = ? OR application_uid = ?').get(id, id) as any;
    if (!transfer) return errorResponse('NOT_FOUND', 'Transfer not found', 404);

    const citizenRow = await db.prepare('SELECT id, full_name, aadhaar_masked FROM citizens WHERE citizen_uid = ?').get(user.uid) as any;
    const citizenUuid = citizenRow?.id;

    // Only buyer, seller, or revenue officers can access
    if (user.role === 'CITIZEN' && citizenUuid !== transfer.seller_id && citizenUuid !== transfer.buyer_id) {
      return errorResponse('FORBIDDEN_ACTION', 'Not authorized to view this TOC', 403);
    }

    // Get signatures
    const signatures = await db.prepare('SELECT citizen_id, role, digital_signature, physical_upload_data, signed_at FROM toc_signatures WHERE transfer_id = ?').all(transfer.id) as any[];
    
    let prefilledData = null;
    if (user.role === 'CITIZEN' && citizenRow) {
      const citizenRole = citizenUuid === transfer.seller_id ? 'SELLER' : 'BUYER';
      const parcel = await db.prepare('SELECT * FROM parcels WHERE id = ?').get(transfer.parcel_id) as any;
      
      prefilledData = {
        role: citizenRole,
        fullName: citizenRow.full_name,
        aadhar: citizenRow.aadhaar_masked,
        parcelUid: parcel?.parcel_uid || 'N/A',
        area: parcel?.area_declared_sqm || 0,
        zone: parcel?.village || parcel?.circle || 'N/A'
      };
    }

    return successResponse({ 
      transferId: transfer.id,
      applicationUid: transfer.application_uid,
      status: transfer.status,
      signatures,
      prefilledData
    });
  } catch (error) {
    console.error('TOC GET Error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch TOC data');
  } finally {
    db.close();
  }
}

// Submit TOC signature & physical upload
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  if (user.role !== 'CITIZEN') {
    return errorResponse('FORBIDDEN_ACTION', 'Only citizens can sign the TOC', 403);
  }

  const db = getDb();
  
  try {
    const { digitalSignature, physicalUploadData } = await req.json();

    if (!digitalSignature || !physicalUploadData) {
      return errorResponse('VALIDATION_ERROR', 'Both digital signature and physical upload are required');
    }

    const transfer = await db.prepare('SELECT * FROM transfers WHERE id = ? OR application_uid = ?').get(id, id) as any;
    if (!transfer) return errorResponse('NOT_FOUND', 'Transfer not found', 404);

    if (transfer.status !== 'TOC_PENDING_SIGNATURES') {
      return errorResponse('INVALID_TRANSITION', 'Transfer is not in TOC pending status');
    }

    const citizenRow = await db.prepare('SELECT id FROM citizens WHERE citizen_uid = ?').get(user.uid) as any;
    const citizenUuid = citizenRow?.id;

    const role = citizenUuid === transfer.seller_id ? 'SELLER' : (citizenUuid === transfer.buyer_id ? 'BUYER' : null);
    if (!role) {
      return errorResponse('FORBIDDEN_ACTION', 'User is not a party to this transfer', 403);
    }

    const existing = await db.prepare('SELECT id FROM toc_signatures WHERE transfer_id = ? AND role = ?').get(transfer.id, role);
    if (existing) {
      return errorResponse('VALIDATION_ERROR', 'Already signed by this party');
    }

    const signedAt = new Date().toISOString();
    
    // Insert signature
    await db.prepare(`
      INSERT INTO toc_signatures (id, transfer_id, citizen_id, role, digital_signature, physical_upload_data, signed_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(`toc-${Date.now()}`, transfer.id, citizenUuid, role, digitalSignature, physicalUploadData, signedAt, signedAt);

    // Check if both parties have signed
    const allSigs = await db.prepare('SELECT role FROM toc_signatures WHERE transfer_id = ?').all(transfer.id) as any[];
    if (allSigs.some(s => s.role === 'SELLER') && allSigs.some(s => s.role === 'BUYER')) {
      const appForSM = {
        id: transfer.id,
        status: transfer.status as any,
        sellerId: transfer.seller_id,
        buyerId: transfer.buyer_id,
        parcelId: transfer.parcel_id,
        heldFromStatus: transfer.held_from_status,
        handshakeAttempts: transfer.handshake_attempts || 0,
        handshakeResendsUsed: transfer.handshake_resends_used || 0,
      };

      const result = TransferStateMachine.transition(appForSM, 'TOC_VERIFICATION_BY_TEHSILDAR', user);
      
      if (!result.success) {
        return errorResponse(result.error?.code || 'INTERNAL_ERROR', `State transition failed: ${result.error?.message}`);
      }

      await db.prepare('UPDATE transfers SET status = ?, updated_at = ? WHERE id = ?')
        .run('TOC_VERIFICATION_BY_TEHSILDAR', new Date().toISOString(), transfer.id);
    }

    return successResponse({ message: 'TOC signatures submitted successfully' });

  } catch (error: any) {
    console.error('TOC POST Error:', error);
    return errorResponse('INTERNAL_ERROR', `Backend Error: ${error.message || String(error)}`);
  } finally {
    db.close();
  }
}
