import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, errorResponse, successResponse } from '@/lib/api/helpers';


export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const { user } = authResult;
  const { id } = await params;
  
  if (user.role === 'CITIZEN') {
    return errorResponse('FORBIDDEN_ACTION', 'Only officers can resolve disputes', 403);
  }

  const db = getDb();

  try {
    const body = await req.json();
    const { action, resolutionNotes } = body as { action: string; resolutionNotes?: string };

    if (!action) {
      return errorResponse('VALIDATION_ERROR', 'Action (target status) is required', 400);
    }

    const dispute = await db.prepare(`
      SELECT d.*, j.path as jurisdiction_path
      FROM land_disputes d
      JOIN parcels p ON d.parcel_id = p.id
      JOIN jurisdictions j ON p.jurisdiction_id = j.id
      WHERE d.id = ? OR d.dispute_uid = ?
    `).get(id, id) as any;

    if (!dispute) {
      return errorResponse('NOT_FOUND', 'Dispute not found', 404);
    }

    if (!dispute.jurisdiction_path.startsWith(user.jurisdictionPath)) {
      return errorResponse('OUT_OF_JURISDICTION', 'This dispute is outside your jurisdiction', 403);
    }

    const now = new Date().toISOString();
    
    await db.prepare('UPDATE land_disputes SET status = ?, resolution_notes = ?, assigned_officer_id = ?, updated_at = ? WHERE id = ?')
      .run(action, resolutionNotes || dispute.resolution_notes, user.id, now, dispute.id);

    return successResponse({
      message: `Dispute status updated to ${action}`,
      disputeUid: dispute.dispute_uid,
      newStatus: action,
    });
  } catch (error) {
    console.error('Dispute action error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to update dispute', 500);
  } finally {
    db.close();
  }
}
