// Bhoomisetu — Citizen Registration API (§3.2)
// POST /api/v1/auth/register/citizen

import { NextRequest } from 'next/server';
import { citizenRegistrationSchema } from '@/lib/validations/schemas';
import { hashPassword, generateSecurePassword } from '@/lib/auth/password';
import { encrypt, maskAadhaar, maskPAN } from '@/lib/auth/encryption';
import { errorResponse, successResponse, createRequestId, getClientIP } from '@/lib/api/helpers';
import { notifyRegistrationCredentials } from '@/lib/services/notification-service';
import { createAuditRow, auditSystem } from '@/lib/services/audit-service';
import { getDb } from '@/lib/db';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  const requestId = createRequestId();

  try {
    const body = await req.json();

    // Validate with Zod
    const result = citizenRegistrationSchema.safeParse(body);
    if (!result.success) {
      return errorResponse('VALIDATION_ERROR', result.error.errors.map(e => e.message).join(', '), 400, requestId);
    }

    const data = result.data;
    const db = getDb();

    try {
      // Check uniqueness: email
      const existingEmail = await db.prepare('SELECT id FROM citizens WHERE email = ?').get(data.email);
      if (existingEmail) {
        return errorResponse('CONFLICT', 'Email already registered', 409, requestId);
      }

      // Check uniqueness: mobile
      const existingMobile = await db.prepare('SELECT id FROM citizens WHERE mobile = ?').get(data.mobile);
      if (existingMobile) {
        return errorResponse('CONFLICT', 'Mobile number already registered', 409, requestId);
      }

      // Generate citizen UID — BSC-<STATE>-<YYYY>-<8 digits>
      const year = new Date().getFullYear();
      const lastCitizen = (await db.prepare(
        "SELECT citizen_uid FROM citizens WHERE citizen_uid LIKE ? ORDER BY citizen_uid DESC LIMIT 1"
      ).get(`BSC-AS-${year}-%`)) as { citizen_uid: string } | undefined;

      let nextNum = 1;
      if (lastCitizen) {
        const parts = lastCitizen.citizen_uid.split('-');
        nextNum = parseInt(parts[3], 10) + 1;
      }
      const citizenUid = `BSC-AS-${year}-${String(nextNum).padStart(8, '0')}`;

      // Generate initial password
      const initialPassword = generateSecurePassword(12);
      const passwordHash = await hashPassword(initialPassword);

      // Encrypt sensitive data
      const aadhaarEnc = encrypt(data.aadhaar);
      const aadhaarMask = maskAadhaar(data.aadhaar);
      const panEnc = encrypt(data.pan);
      const panMask = maskPAN(data.pan);

      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      // Insert citizen
      await db.prepare(`
        INSERT INTO citizens (id, citizen_uid, full_name, email, mobile,
          aadhaar_encrypted, aadhaar_masked, pan_encrypted, pan_masked,
          date_of_birth, address_line1, address_line2, village_town, district, state, pin,
          password_hash, status, must_change_password, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'ACTIVE', false, ?, ?)
      `).run(
        id, citizenUid, data.fullName, data.email, data.mobile,
        aadhaarEnc, aadhaarMask, panEnc, panMask,
        data.dateOfBirth, data.addressLine1, data.addressLine2 || null,
        data.villageTown, data.district, data.state, data.pin,
        passwordHash, now, now
      );

      // Audit
      const auditRow = createAuditRow({
        ...auditSystem(),
        action: 'CITIZEN_REGISTERED',
        entityType: 'CITIZEN',
        entityId: citizenUid,
        previousStatus: null,
        newStatus: 'ACTIVE',
        reason: null,
        metadata: { email: data.email },
        ipAddress: getClientIP(req),
        userAgent: req.headers.get('user-agent'),
      });
      await db.prepare(`
        INSERT INTO audit_log (actor_id, actor_type, actor_role_code, actor_jurisdiction_id,
          action, entity_type, entity_id, previous_status, new_status, reason, metadata,
          ip_address, user_agent, chain_hash, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        auditRow.actorId, auditRow.actorType, auditRow.actorRoleCode, auditRow.actorJurisdictionId,
        auditRow.action, auditRow.entityType, auditRow.entityId,
        auditRow.previousStatus, auditRow.newStatus, auditRow.reason, auditRow.metadata,
        auditRow.ipAddress, auditRow.userAgent, auditRow.chainHash, auditRow.createdAt
      );

      // Send credentials (dev: console + outbox)
      notifyRegistrationCredentials(citizenUid, data.email, initialPassword);

      return successResponse({
        message: 'Registration successful',
        citizenUid,
        initialPassword,
      }, 201);
    } finally {
      db.close();
    }
  } catch (error) {
    console.error('Registration error:', error);
    return errorResponse('INTERNAL_ERROR', 'Registration failed', 500, requestId);
  }
}
