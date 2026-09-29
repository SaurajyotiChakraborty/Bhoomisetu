// Bhoomisetu — Transfers Queue API
// GET /api/v1/transfers/queue — role + jurisdiction scoped
// GET /api/v1/transfers/mine — citizen's own transfers

import { NextRequest } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, errorResponse, successResponse } from '@/lib/api/helpers';


export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const { user, requestId } = authResult;
  const db = getDb();

  try {
    if (user.role === 'CITIZEN') {
      // Citizens see their own transfers (as seller or buyer)
      const transfers = await db.prepare(`
        SELECT t.id, t.application_uid, t.transfer_type, t.consideration_amount, t.status,
               t.created_at, t.updated_at,
               p.parcel_uid, p.village, p.survey_number, p.land_type, p.area_declared_sqm,
               seller.full_name as seller_name, seller.citizen_uid as seller_uid,
               buyer.full_name as buyer_name, buyer.citizen_uid as buyer_uid
        FROM transfers t
        JOIN parcels p ON t.parcel_id = p.id
        JOIN citizens seller ON t.seller_id = seller.id
        JOIN citizens buyer ON t.buyer_id = buyer.id
        WHERE seller.citizen_uid = ? OR buyer.citizen_uid = ?
        ORDER BY t.updated_at DESC
      `).all(user.uid, user.uid);

      return successResponse({ transfers, count: transfers.length });
    } else {
      // Officers see jurisdiction-scoped transfers with relevant statuses
      if (!user.jurisdictionPath) {
        return errorResponse('FORBIDDEN_ACTION', 'No jurisdiction assigned', 403, requestId);
      }

      // Filter by statuses relevant to the officer's role
      const statusFilters: Record<string, string[]> = {
        CIRCLE_OFF: ['AT_CIRCLE_OFFICER_HANDSHAKE', 'AT_CIRCLE_OFFICER_VERIFICATION'],
        TEHSILDAR: ['FORWARDED_TO_TEHSILDAR', 'AT_TEHSILDAR_VERIFICATION', 'TOC_VERIFICATION_BY_TEHSILDAR'],
        SDO: ['FORWARDED_TO_SDO', 'AT_SDO_REVIEW', 'APPROVED_PENDING_DECLARATION', 'PENDING_DIGITAL_SIGNATURES', 'SIGNATURES_COMPLETE'],
        DIST_COLL: [], // sees all
        DIV_COMM: [], // sees all
        VILLAGE_OFF: [],
      };

      const relevantStatuses = statusFilters[user.role] || [];
      let statusClause = '';
      if (relevantStatuses.length > 0) {
        statusClause = `AND t.status IN (${relevantStatuses.map(s => `'${s}'`).join(',')})`;
      }

      const transfers = await db.prepare(`
        SELECT t.id, t.application_uid, t.transfer_type, t.consideration_amount, t.status,
               t.created_at, t.updated_at,
               p.parcel_uid, p.village, p.survey_number, p.land_type, p.area_declared_sqm,
               seller.full_name as seller_name,
               buyer.full_name as buyer_name,
               j.name as zone_name
        FROM transfers t
        JOIN parcels p ON t.parcel_id = p.id
        JOIN citizens seller ON t.seller_id = seller.id
        JOIN citizens buyer ON t.buyer_id = buyer.id
        JOIN jurisdictions j ON p.jurisdiction_id = j.id
        WHERE j.path LIKE ? ${statusClause}
        ORDER BY t.updated_at DESC
      `).all(`${user.jurisdictionPath}%`);

      return successResponse({ transfers, count: transfers.length });
    }
  } finally {
    db.close();
  }
}
