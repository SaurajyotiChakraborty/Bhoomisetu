import { NextRequest } from 'next/server';
import { requireAuth, errorResponse, successResponse } from '@/lib/api/helpers';
import Database from 'better-sqlite3';
import path from 'path';

function getDb() {
  const DB_PATH = process.env.DATABASE_URL || path.join(process.cwd(), 'data', 'bhoomisetu.db');
  return new Database(DB_PATH);
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;

  const { user } = authResult;

  // Only Citizens and Village Officers can pay taxes
  if (user.role !== 'CITIZEN' && user.role !== 'VILLAGE_OFF') {
    return errorResponse('FORBIDDEN_ACTION', 'Unauthorized to perform tax payment', 403);
  }

  try {
    const { taxId, paymentMode } = await req.json();

    if (!taxId) {
      return errorResponse('VALIDATION_ERROR', 'Tax ID is required');
    }

    if (!['ONLINE', 'CASH'].includes(paymentMode)) {
      return errorResponse('VALIDATION_ERROR', 'Invalid payment mode');
    }

    // Village Officers can only collect CASH, Citizens can only pay ONLINE
    if (user.role === 'VILLAGE_OFF' && paymentMode !== 'CASH') {
      return errorResponse('FORBIDDEN_ACTION', 'Village Officers can only process CASH payments');
    }
    if (user.role === 'CITIZEN' && paymentMode !== 'ONLINE') {
      return errorResponse('FORBIDDEN_ACTION', 'Citizens can only process ONLINE payments');
    }

    const db = getDb();
    
    // Get the tax record
    const tax = db.prepare('SELECT * FROM land_taxes WHERE id = ?').get(taxId) as any;
    
    if (!tax) {
      return errorResponse('NOT_FOUND', 'Tax record not found', 404);
    }
    
    if (tax.status === 'PAID') {
      return errorResponse('VALIDATION_ERROR', 'Tax is already paid');
    }

    // Generate a receipt number
    const receiptNumber = `RCPT-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 900000)}`;
    const paidAt = new Date().toISOString();
    
    const collectedBy = paymentMode === 'CASH' && user.role === 'VILLAGE_OFF' ? user.id : null;

    db.prepare(`
      UPDATE land_taxes 
      SET status = 'PAID', paid_at = ?, receipt_number = ?, payment_mode = ?, collected_by = ?, updated_at = ?
      WHERE id = ?
    `).run(paidAt, receiptNumber, paymentMode, collectedBy, paidAt, taxId);

    return successResponse({ 
      message: 'Payment successful',
      receipt_number: receiptNumber,
      payment_mode: paymentMode
    });

  } catch (error: any) {
    console.error('Tax Payment API Error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to process payment');
  }
}
