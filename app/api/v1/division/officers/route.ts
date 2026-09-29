import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { requireAuth, errorResponse, successResponse } from '@/lib/api/helpers';


export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  if (user.role !== 'DIV_COMM') {
    return errorResponse('FORBIDDEN_ACTION', 'Access restricted to Division Commissioner', 403);
  }

  const db = getDb();
  
  try {
    const officers = await db.prepare(`
      SELECT o.id, o.officer_uid, o.full_name, o.email, o.mobile, 
             o.role_code, o.jurisdiction_id, o.effective_from, j.name as jurisdiction_name, j.type as jurisdiction_type
      FROM officers o
      LEFT JOIN jurisdictions j ON o.jurisdiction_id = j.id
      ORDER BY 
        CASE j.type 
          WHEN 'DIVISION' THEN 1
          WHEN 'DISTRICT' THEN 2
          WHEN 'SUBDIVISION' THEN 3
          WHEN 'TEHSIL' THEN 4
          WHEN 'CIRCLE' THEN 5
          WHEN 'VILLAGE' THEN 6
          ELSE 7
        END ASC,
        j.name ASC,
        o.role_code ASC
    `).all();

    return successResponse({ officers });
  } catch (error: any) {
    console.error('Division Officers API Error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to fetch officers');
  }
}

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof Response) return authResult;
  const { user } = authResult;

  if (user.role !== 'DIV_COMM') {
    return errorResponse('FORBIDDEN_ACTION', 'Access restricted to Division Commissioner', 403);
  }

  const db = getDb();
  
  try {
    const { action, officer_uid, password, new_role, new_jurisdiction, full_name, email, phone } = await req.json();

    if (action === 'RESET_PASSWORD') {
      if (!officer_uid || !password) return errorResponse('VALIDATION_ERROR', 'Missing fields');
      // Update the password in database
      const result = await db.prepare('UPDATE officers SET password_hash = ? WHERE officer_uid = ?').run(password, officer_uid);
      if (result.changes === 0) return errorResponse('NOT_FOUND', 'Officer not found');
      return successResponse({ message: 'Password reset successfully' });
    }

    if (action === 'CREATE_OFFICER') {
      const id = 'off-' + Date.now();
      const created_at = new Date().toISOString();
      const effective_from = created_at;
      
      await db.prepare(`
        INSERT INTO officers (id, officer_uid, full_name, email, mobile, role_code, jurisdiction_id, password_hash, effective_from, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(id, officer_uid, full_name, email, phone, new_role, new_jurisdiction, password, effective_from, created_at, created_at);

      await db.prepare(`
        INSERT INTO officer_appointments (id, officer_id, appointed_by, role_code, jurisdiction_id, effective_from, action, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('app-' + Date.now(), id, user.id, new_role, new_jurisdiction, effective_from, 'APPOINTED', created_at);

      return successResponse({ message: 'Officer created successfully' });
    }

    if (action === 'TRANSFER_OFFICER') {
      if (!officer_uid || !new_role || !new_jurisdiction) return errorResponse('VALIDATION_ERROR', 'Missing fields');
      
      const officer = await db.prepare('SELECT id FROM officers WHERE officer_uid = ?').get(officer_uid) as any;
      if (!officer) return errorResponse('NOT_FOUND', 'Officer not found');

      const created_at = new Date().toISOString();
      const effective_from = created_at;

      // End previous appointment
      await db.prepare(`
        UPDATE officer_appointments SET effective_to = ? WHERE officer_id = ? AND effective_to IS NULL
      `).run(created_at, officer.id);

      // Add new appointment
      await db.prepare(`
        INSERT INTO officer_appointments (id, officer_id, appointed_by, role_code, jurisdiction_id, effective_from, action, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run('app-' + Date.now(), officer.id, user.id, new_role, new_jurisdiction, effective_from, 'TRANSFERRED', created_at);

      // Update primary officer record
      await db.prepare(`
        UPDATE officers 
        SET role_code = ?, jurisdiction_id = ?, effective_from = ?, updated_at = ?
        WHERE id = ?
      `).run(new_role, new_jurisdiction, effective_from, created_at, officer.id);

      return successResponse({ message: 'Officer transferred successfully' });
    }

    return errorResponse('INVALID_TRANSITION', 'Unknown action');
  } catch (error: any) {
    console.error('Division Officers API Error:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to process officer action');
  }
}
