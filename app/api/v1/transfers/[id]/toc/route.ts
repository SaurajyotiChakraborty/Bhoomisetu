import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/lib/api/helpers';
import { TransferStateMachine } from '@/lib/state-machine/transfer-state-machine';
import Database from 'better-sqlite3';
import path from 'path';

function getDb() {
  const DB_PATH = process.env.DATABASE_URL || path.join(process.cwd(), 'data', 'bhoomisetu.db');
  return new Database(DB_PATH);
}

// Get TOC status and pre-filled data
export async function GET(req: NextRequest, context: any) {
  const params = await context.params;
  const id = params.id;
  
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  const db = getDb();

  try {
    const transfer = db.prepare('SELECT * FROM transfers WHERE id = ?').get(id) as any;
    if (!transfer) return errorResponse('NOT_FOUND', 'Transfer not found', 404);

    const citizenRow = db.prepare('SELECT id, full_name, aadhaar_masked FROM citizens WHERE citizen_uid = ?').get(user.uid) as any;
    const citizenUuid = citizenRow?.id;

    // Only buyer, seller, or Tehsildar can access
    if (user.role === 'CITIZEN' && citizenUuid !== transfer.seller_id && citizenUuid !== transfer.buyer_id) {
      return errorResponse('FORBIDDEN_ACTION', 'Not authorized to view this TOC', 403);
    }

    // Get signatures
    const signatures = db.prepare('SELECT citizen_id, role, digital_signature, physical_upload_data, signed_at FROM toc_signatures WHERE transfer_id = ?').all(id) as any[];
    
    let prefilledData = null;
    if (user.role === 'CITIZEN') {
      const citizenRole = citizenUuid === transfer.seller_id ? 'SELLER' : 'BUYER';
      const parcel = db.prepare('SELECT * FROM parcels WHERE id = ?').get(transfer.parcel_id) as any;
      
      prefilledData = {
        role: citizenRole,
        fullName: citizenRow.full_name,
        aadhar: citizenRow.aadhaar_masked,
        parcelUid: parcel.parcel_uid,
        area: parcel.area_declared_sqm,
        zone: parcel.village || parcel.circle || 'N/A'
      };
    }

    return successResponse({ 
      signatures,
      prefilledData
    });
  } catch (error) {
    console.error('TOC GET Error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch TOC data');
  }
}

// Submit TOC signature & physical upload
export async function POST(req: NextRequest, context: any) {
  const params = await context.params;
  const id = params.id;

  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { user, requestId } = authResult;

  if (user.role !== 'CITIZEN') {
    return errorResponse('FORBIDDEN_ACTION', 'Only citizens can sign the TOC', 403);
  }

  const db = getDb();
  
  try {
    const { digitalSignature, physicalUploadData } = await req.json();

    if (!digitalSignature || !physicalUploadData) {
      return errorResponse('VALIDATION_ERROR', 'Both digital signature and physical upload are required');
    }

    const transfer = db.prepare('SELECT * FROM transfers WHERE id = ?').get(id) as any;
    if (!transfer) return errorResponse('NOT_FOUND', 'Transfer not found', 404);

    if (transfer.status !== 'TOC_PENDING_SIGNATURES') {
      return errorResponse('INVALID_TRANSITION', 'Transfer is not in TOC pending status');
    }

    const citizenRow = db.prepare('SELECT id FROM citizens WHERE citizen_uid = ?').get(user.uid) as any;
    const citizenUuid = citizenRow?.id;

    const role = citizenUuid === transfer.seller_id ? 'SELLER' : (citizenUuid === transfer.buyer_id ? 'BUYER' : null);
    if (!role) {
      return errorResponse('FORBIDDEN_ACTION', 'User is not a party to this transfer', 403);
    }

    const existing = db.prepare('SELECT id FROM toc_signatures WHERE transfer_id = ? AND role = ?').get(id, role);
    if (existing) {
      return errorResponse('VALIDATION_ERROR', 'Already signed by this party');
    }

    const signedAt = new Date().toISOString();
    
    // Insert signature
    db.prepare(`
      INSERT INTO toc_signatures (id, transfer_id, citizen_id, role, digital_signature, physical_upload_data, signed_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(`toc-${Date.now()}`, id, citizenUuid, role, digitalSignature, physicalUploadData, signedAt, signedAt);

    // Check if both parties have signed
    const allSigs = db.prepare('SELECT role FROM toc_signatures WHERE transfer_id = ?').all(id) as any[];
    if (allSigs.some(s => s.role === 'SELLER') && allSigs.some(s => s.role === 'BUYER')) {
      // Transition state
      const result = TransferStateMachine.transition(transfer, 'TOC_VERIFICATION_BY_TEHSILDAR', user, requestId);
      
      if (!result.success) {
        return errorResponse(result.error?.code || 'INTERNAL_ERROR', `State transition failed: ${result.error?.message} (From ${transfer.status} to TOC_VERIFICATION_BY_TEHSILDAR, User Role: ${user.role})`);
      }

      db.prepare('UPDATE transfers SET status = ?, updated_at = ? WHERE id = ?')
        .run('TOC_VERIFICATION_BY_TEHSILDAR', new Date().toISOString(), id);
    }

    return successResponse({ message: 'TOC signatures submitted successfully' });

  } catch (error: any) {
    console.error('TOC POST Error:', error);
    return errorResponse('INTERNAL_ERROR', `Backend Error: ${error.message || String(error)}`);
  }
}
