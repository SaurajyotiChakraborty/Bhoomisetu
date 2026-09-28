// Bhoomisetu — Audit Service
// Append-only audit log with tamper-evident hash chain (§11)

import { nanoid } from 'nanoid';
import { computeSHA256 } from '@/lib/auth/encryption';
import type { ActorType, AuditEntityType, AuthUser } from '@/lib/types';

let lastChainHash = '0000000000000000000000000000000000000000000000000000000000000000';

export interface AuditEntry {
  actorId: string | null;
  actorType: ActorType;
  actorRoleCode: string | null;
  actorJurisdictionId: string | null;
  action: string;
  entityType: AuditEntityType;
  entityId: string;
  previousStatus: string | null;
  newStatus: string | null;
  reason: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
}

export function createAuditRow(entry: AuditEntry): {
  id: number | undefined;
  actorId: string | null;
  actorType: string;
  actorRoleCode: string | null;
  actorJurisdictionId: string | null;
  action: string;
  entityType: string;
  entityId: string;
  previousStatus: string | null;
  newStatus: string | null;
  reason: string | null;
  metadata: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  chainHash: string;
  createdAt: string;
} {
  const now = new Date().toISOString();
  const metadataStr = entry.metadata ? JSON.stringify(entry.metadata) : null;

  // Compute chain hash
  const payload = JSON.stringify({
    ...entry,
    metadata: metadataStr,
    createdAt: now,
    prevHash: lastChainHash,
  });
  const chainHash = computeSHA256(payload);
  lastChainHash = chainHash;

  return {
    id: undefined,
    actorId: entry.actorId,
    actorType: entry.actorType,
    actorRoleCode: entry.actorRoleCode,
    actorJurisdictionId: entry.actorJurisdictionId,
    action: entry.action,
    entityType: entry.entityType,
    entityId: entry.entityId,
    previousStatus: entry.previousStatus,
    newStatus: entry.newStatus,
    reason: entry.reason,
    metadata: metadataStr,
    ipAddress: entry.ipAddress,
    userAgent: entry.userAgent,
    chainHash,
    createdAt: now,
  };
}

export function auditFromUser(user: AuthUser): {
  actorId: string;
  actorType: ActorType;
  actorRoleCode: string;
  actorJurisdictionId: string | null;
} {
  return {
    actorId: user.uid,
    actorType: user.role === 'CITIZEN' ? 'CITIZEN' : 'OFFICER',
    actorRoleCode: user.role,
    actorJurisdictionId: user.jurisdictionId,
  };
}

export function auditSystem(): {
  actorId: null;
  actorType: ActorType;
  actorRoleCode: null;
  actorJurisdictionId: null;
} {
  return {
    actorId: null,
    actorType: 'SYSTEM',
    actorRoleCode: null,
    actorJurisdictionId: null,
  };
}
