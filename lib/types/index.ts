// Bhoomisetu — Shared TypeScript Types

// ========================
// Role System
// ========================

export type RoleCode =
  | 'DIV_COMM'
  | 'DIST_COLL'
  | 'SDO'
  | 'TEHSILDAR'
  | 'CIRCLE_OFF'
  | 'VILLAGE_OFF'
  | 'CITIZEN';

export type JurisdictionType =
  | 'DIVISION'
  | 'DISTRICT'
  | 'SUBDIVISION'
  | 'TEHSIL'
  | 'CIRCLE'
  | 'VILLAGE';

export type AccountStatus = 'ACTIVE' | 'LOCKED' | 'SUSPENDED' | 'RETIRED';

// ========================
// Permission Families
// ========================

// Family A — Workflow permissions
export type WorkflowPermission =
  | 'application.view'
  | 'application.view.own'
  | 'application.create'
  | 'application.cancel.own'
  | 'application.verify.basic'
  | 'application.verify.detailed'
  | 'application.forward'
  | 'application.hold'
  | 'application.return'
  | 'application.reject'
  | 'application.approve.final'
  | 'application.monitor.subordinate'
  | 'application.reassign'
  | 'handshake.verify'
  | 'signature.request'
  | 'signature.countersign'
  | 'officer.appoint'
  | 'parcel.lookup.public'
  | 'parcel.view.jurisdiction'
  | 'village.record.assist'
  | 'village.record.monitor';

// Family B — Source-data permissions
export type SourcePermission =
  | 'source.parcel.read'
  | 'source.parcel.write'   // NEVER assigned
  | 'source.owner.write'    // NEVER assigned
  | 'correction.request'
  | 'correction.endorse'
  | 'correction.dispatch'
  | 'audit.view'
  | 'audit.view.own';

export type Permission = WorkflowPermission | SourcePermission;

// ========================
// Land Records
// ========================

export type LandType =
  | 'AGRICULTURAL'
  | 'RESIDENTIAL'
  | 'COMMERCIAL'
  | 'INDUSTRIAL'
  | 'GOVT'
  | 'FOREST'
  | 'WATER_BODY';

export type OwnershipType = 'SOLE' | 'JOINT' | 'INHERITED' | 'LEASE';

export type EncumbranceStatus = 'CLEAR' | 'MORTGAGED' | 'DISPUTED' | 'ATTACHED';

export type TransferType = 'SALE' | 'GIFT' | 'INHERITANCE' | 'PARTITION' | 'EXCHANGE';

// ========================
// Transfer Workflow
// ========================

export type TransferStatus =
  | 'BUYER_REQUEST_PENDING'
  | 'MUTUAL_TOC_PENDING_SIGNATURES'
  | 'MUTUAL_TOC_SIGNED'
  | 'PENDING_DOCUMENT_UPLOAD'
  | 'AT_CIRCLE_OFFICER_VERIFICATION'
  | 'FORWARDED_TO_TEHSILDAR'
  | 'AT_TEHSILDAR_VERIFICATION'
  | 'TOC_PENDING_SIGNATURES'
  | 'TOC_VERIFICATION_BY_TEHSILDAR'
  | 'FORWARDED_TO_SDO'
  | 'AT_SDO_REVIEW'
  | 'APPROVED_PENDING_DECLARATION'
  | 'PENDING_DIGITAL_SIGNATURES'
  | 'SIGNATURES_COMPLETE'
  | 'TRANSFER_COMPLETED'
  | 'ON_HOLD'
  | 'RETURNED_FOR_CORRECTION'
  | 'REJECTED'
  | 'CANCELLED_BY_APPLICANT';

export const TERMINAL_STATUSES: TransferStatus[] = [
  'TRANSFER_COMPLETED',
  'REJECTED',
  'CANCELLED_BY_APPLICANT',
];

// ========================
// Correction Requests
// ========================

export type CorrectionStatus =
  | 'RAISED'
  | 'ENDORSED'
  | 'DISPATCHED_TO_SOURCE'
  | 'ACCEPTED_BY_SOURCE'
  | 'REJECTED_BY_SOURCE';

// ========================
// Audit
// ========================

export type ActorType = 'CITIZEN' | 'OFFICER' | 'SYSTEM';

export type AuditEntityType =
  | 'APPLICATION'
  | 'PARCEL'
  | 'OFFICER'
  | 'CORRECTION'
  | 'SIGNATURE'
  | 'CITIZEN'
  | 'AUTH';

// ========================
// Auth
// ========================

export type LoginMode = 'CITIZEN' | 'EMPLOYEE';

export interface JWTPayload {
  sub: string;           // userId (citizen_uid or officer_uid)
  role: RoleCode;
  roleLevel: number;
  jurisdictionId: string | null;
  jurisdictionPath: string | null;
  permissions: Permission[];
  jti: string;           // unique token ID
  mode: LoginMode;
  mustChangePassword?: boolean;
}

export interface AuthUser {
  id: string;
  uid: string;
  role: RoleCode;
  roleLevel: number;
  jurisdictionId: string | null;
  jurisdictionPath: string | null;
  permissions: Permission[];
  mode: LoginMode;
  fullName: string;
}

// ========================
// API Error Envelope
// ========================

export interface APIError {
  error: {
    code: string;
    message: string;
    requestId: string;
  };
}

export type ErrorCode =
  | 'IDENTIFIER_IMMUTABLE'
  | 'OUT_OF_JURISDICTION'
  | 'FORBIDDEN_ACTION'
  | 'INVALID_TRANSITION'
  | 'HANDSHAKE_FAILED'
  | 'SOURCE_TAMPER_DETECTED'
  | 'INVALID_CREDENTIALS'
  | 'ACCOUNT_LOCKED'
  | 'ACCOUNT_SUSPENDED'
  | 'MUST_CHANGE_PASSWORD'
  | 'OTP_EXPIRED'
  | 'OTP_MAX_ATTEMPTS'
  | 'OTP_RATE_LIMITED'
  | 'RATE_LIMITED'
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'
  | 'PRECONDITION_FAILED';

// ========================
// Notification
// ========================

export type NotificationChannel = 'IN_APP' | 'EMAIL' | 'SMS';

// ========================
// Progress Bar Steps
// ========================

export interface ProgressStep {
  number: number;
  label: string;
  statuses: TransferStatus[];
}

export type StepVisualState = 'completed' | 'current' | 'pending' | 'blocked' | 'failed';

export const PROGRESS_STEPS: ProgressStep[] = [
  { number: 1, label: 'Application Submitted', statuses: ['BUYER_REQUEST_PENDING'] },
  { number: 2, label: 'Counterparty Consent', statuses: ['MUTUAL_TOC_PENDING_SIGNATURES', 'MUTUAL_TOC_SIGNED'] },
  { number: 3, label: 'Circle Office — Code Verification', statuses: ['PENDING_DOCUMENT_UPLOAD'] },
  { number: 4, label: 'Circle Office — Basic Verification', statuses: ['AT_CIRCLE_OFFICER_VERIFICATION'] },
  { number: 5, label: 'Tehsildar — Detailed Verification', statuses: ['FORWARDED_TO_TEHSILDAR', 'AT_TEHSILDAR_VERIFICATION'] },
  { number: 6, label: 'SDO — Final Review', statuses: ['FORWARDED_TO_SDO', 'AT_SDO_REVIEW'] },
  { number: 7, label: 'Declaration & Digital Signature', statuses: ['APPROVED_PENDING_DECLARATION', 'PENDING_DIGITAL_SIGNATURES', 'SIGNATURES_COMPLETE'] },
  { number: 8, label: 'Transfer Completed', statuses: ['TRANSFER_COMPLETED'] },
];
