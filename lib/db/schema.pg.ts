// Bhoomisetu — PostgreSQL Schema (§4.3, §6.1, §8, §11)
// For AWS RDS / Production PostgreSQL + PostGIS deployment

import {
  pgTable,
  text,
  integer,
  doublePrecision,
  boolean,
  serial,
  timestamp,
  index,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

// ========================
// Jurisdictions — Materialised-path tree (§4.3)
// ========================
export const jurisdictions = pgTable('jurisdictions', {
  id: text('id').primaryKey(),                            // UUID
  code: text('code').notNull().unique(),                  // e.g. 'AS.UPPER_ASSAM.SONITPUR'
  name: text('name').notNull(),                           // e.g. 'Sonitpur'
  type: text('type').notNull(),                           // DIVISION | DISTRICT | SUBDIVISION | TEHSIL | CIRCLE | VILLAGE
  parentId: text('parent_id'),
  path: text('path').notNull(),                           // materialised path: 'AS.UPPER_ASSAM.SONITPUR.TEZPUR'
  geometry: text('geometry'),                             // GeoJSON / PostGIS geometry representation
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ========================
// Roles (§4.2)
// ========================
export const roles = pgTable('roles', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),                  // DIV_COMM, DIST_COLL, etc.
  name: text('name').notNull(),
  level: integer('level').notNull(),                      // 1 = highest authority
  scope: text('scope').notNull(),                         // DIVISION, DISTRICT, etc.
  dashboardRoute: text('dashboard_route').notNull(),
  allowsMultiple: boolean('allows_multiple').default(false),
  createdAt: text('created_at').notNull(),
});

// ========================
// Permissions (§4.4)
// ========================
export const permissions = pgTable('permissions', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),                  // e.g. 'application.view'
  family: text('family').notNull(),                       // 'WORKFLOW' | 'SOURCE_DATA'
  description: text('description'),
  createdAt: text('created_at').notNull(),
});

export const rolePermissions = pgTable('role_permissions', {
  id: text('id').primaryKey(),
  roleCode: text('role_code').notNull(),
  permissionCode: text('permission_code').notNull(),
  createdAt: text('created_at').notNull(),
});

// ========================
// Citizens (§3.2)
// ========================
export const citizens = pgTable('citizens', {
  id: text('id').primaryKey(),                            // internal UUID
  citizenUid: text('citizen_uid').notNull().unique(),     // BSC-AS-2026-00042317 — IMMUTABLE
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  mobile: text('mobile').notNull().unique(),
  aadhaarEncrypted: text('aadhaar_encrypted').notNull(),  // AES-256-GCM encrypted
  aadhaarMasked: text('aadhaar_masked').notNull(),        // XXXX XXXX 1234
  panEncrypted: text('pan_encrypted').notNull(),          // AES-256-GCM encrypted
  panMasked: text('pan_masked').notNull(),                // ABCDE****F
  dateOfBirth: text('date_of_birth').notNull(),           // ISO date string
  addressLine1: text('address_line1').notNull(),
  addressLine2: text('address_line2'),
  villageTown: text('village_town').notNull(),
  district: text('district').notNull(),
  state: text('state').notNull(),
  pin: text('pin').notNull(),
  passwordHash: text('password_hash').notNull(),
  status: text('status').notNull().default('ACTIVE'),     // ACTIVE | LOCKED | SUSPENDED | RETIRED
  mustChangePassword: boolean('must_change_password').default(false),
  failedLoginAttempts: integer('failed_login_attempts').default(0),
  lockedUntil: text('locked_until'),
  passwordHistory: text('password_history'),              // JSON array of last 5 hashes
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ========================
// Officers (§3.4)
// ========================
export const officers = pgTable('officers', {
  id: text('id').primaryKey(),
  officerUid: text('officer_uid').notNull().unique(),     // BSO-TEH-AS0905-000231 — IMMUTABLE
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  mobile: text('mobile').notNull(),
  roleCode: text('role_code').notNull(),
  jurisdictionId: text('jurisdiction_id').notNull().references(() => jurisdictions.id),
  passwordHash: text('password_hash').notNull(),
  status: text('status').notNull().default('ACTIVE'),
  mustChangePassword: boolean('must_change_password').default(true),
  tempPasswordExpiresAt: text('temp_password_expires_at'),
  failedLoginAttempts: integer('failed_login_attempts').default(0),
  lockedUntil: text('locked_until'),
  passwordHistory: text('password_history'),
  appointedBy: text('appointed_by'),
  effectiveFrom: text('effective_from').notNull(),
  effectiveTo: text('effective_to'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ========================
// Officer Appointments (§5)
// ========================
export const officerAppointments = pgTable('officer_appointments', {
  id: text('id').primaryKey(),
  officerId: text('officer_id').notNull().references(() => officers.id),
  appointedBy: text('appointed_by').notNull(),
  roleCode: text('role_code').notNull(),
  jurisdictionId: text('jurisdiction_id').notNull(),
  effectiveFrom: text('effective_from').notNull(),
  effectiveTo: text('effective_to'),
  action: text('action').notNull(),                       // APPOINTED | TRANSFERRED | DEACTIVATED
  reason: text('reason'),
  createdAt: text('created_at').notNull(),
});

// ========================
// OTPs (§3.2)
// ========================
export const otps = pgTable('otps', {
  id: text('id').primaryKey(),
  destination: text('destination').notNull(),
  channel: text('channel').notNull(),                     // EMAIL | SMS
  purpose: text('purpose').notNull(),                     // REGISTRATION | FORGOT_PASSWORD | VERIFICATION
  codeHash: text('code_hash').notNull(),
  expiresAt: text('expires_at').notNull(),
  attempts: integer('attempts').default(0),
  maxAttempts: integer('max_attempts').default(5),
  verifiedAt: text('verified_at'),
  invalidated: boolean('invalidated').default(false),
  ipAddress: text('ip_address'),
  createdAt: text('created_at').notNull(),
});

// ========================
// Parcels (§6.1)
// ========================
export const parcels = pgTable('parcels', {
  id: text('id').primaryKey(),                            // UUID
  parcelUid: text('parcel_uid').notNull().unique(),       // AS-SONITPUR-TEZPUR-BORGHAT-114-2A
  state: text('state').notNull(),
  district: text('district').notNull(),
  subdivision: text('subdivision').notNull(),
  tehsil: text('tehsil').notNull(),
  circle: text('circle').notNull(),
  village: text('village').notNull(),
  jurisdictionId: text('jurisdiction_id').notNull().references(() => jurisdictions.id),
  surveyNumber: text('survey_number').notNull(),          // PROTECTED
  subdivisionNumber: text('subdivision_number'),          // PROTECTED
  pattaNumber: text('patta_number'),                      // PROTECTED
  khatianNumber: text('khatian_number'),
  landType: text('land_type').notNull(),
  landClass: text('land_class'),
  areaDeclaredSqm: doublePrecision('area_declared_sqm').notNull(),   // PROTECTED
  areaComputedSqm: doublePrecision('area_computed_sqm'),
  geometry: text('geometry'),                             // GeoJSON / PostGIS Polygon — PROTECTED
  boundaryNorth: text('boundary_north'),
  boundarySouth: text('boundary_south'),
  boundaryEast: text('boundary_east'),
  boundaryWest: text('boundary_west'),
  currentOwnerId: text('current_owner_id').references(() => citizens.id),
  ownershipType: text('ownership_type').notNull(),
  encumbranceStatus: text('encumbrance_status').notNull().default('CLEAR'),
  sourceAuthority: text('source_authority'),
  sourceRecordHash: text('source_record_hash'),           // SHA-256 — PROTECTED
  sourceFetchedAt: text('source_fetched_at'),
  isLocked: boolean('is_locked').default(true),
  derivedFromParcelId: text('derived_from_parcel_id'),
  pendingSourceConfirmation: boolean('pending_source_confirmation').default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ========================
// Ownership History (§7.3) — APPEND-ONLY
// ========================
export const ownershipHistory = pgTable('ownership_history', {
  id: text('id').primaryKey(),
  parcelId: text('parcel_id').notNull().references(() => parcels.id),
  fromOwnerId: text('from_owner_id'),
  toOwnerId: text('to_owner_id').notNull().references(() => citizens.id),
  transferType: text('transfer_type').notNull(),
  transferDate: text('transfer_date').notNull(),
  applicationId: text('application_id'),
  approvingOfficerId: text('approving_officer_id'),
  registrationReference: text('registration_reference'),
  consideration: doublePrecision('consideration'),
  createdAt: text('created_at').notNull(),
});

// ========================
// Transfer Applications (§8)
// ========================
export const transfers = pgTable('transfers', {
  id: text('id').primaryKey(),
  applicationUid: text('application_uid').notNull().unique(),
  parcelId: text('parcel_id').notNull().references(() => parcels.id),
  sellerId: text('seller_id').notNull().references(() => citizens.id),
  buyerId: text('buyer_id').notNull().references(() => citizens.id),
  transferType: text('transfer_type').notNull(),
  considerationAmount: doublePrecision('consideration_amount'),
  isPartialTransfer: boolean('is_partial_transfer').default(false),
  partialArea: doublePrecision('partial_area'),
  partialGeometry: text('partial_geometry'),
  status: text('status').notNull().default('DRAFT'),
  heldFromStatus: text('held_from_status'),
  returnedByRole: text('returned_by_role'),
  returnedTo: text('returned_to'),
  rejectionReason: text('rejection_reason'),
  cancellationReason: text('cancellation_reason'),
  handshakeVerifiedAt: text('handshake_verified_at'),
  handshakeAttempts: integer('handshake_attempts').default(0),
  handshakeResendsUsed: integer('handshake_resends_used').default(0),
  circleVerificationData: text('circle_verification_data'),
  tehsildarVerificationData: text('tehsildar_verification_data'),
  sdoReviewData: text('sdo_review_data'),
  feeVerificationData: text('fee_verification_data'),
  sdoApprovalNote: text('sdo_approval_note'),
  sdoApprovalReference: text('sdo_approval_reference'),
  approvedAt: text('approved_at'),
  declarationDocumentHash: text('declaration_document_hash'),
  declarationGeneratedAt: text('declaration_generated_at'),
  completedAt: text('completed_at'),
  currentOfficerId: text('current_officer_id'),
  currentJurisdictionId: text('current_jurisdiction_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ========================
// Handshake Codes (§8.2 Stage 3)
// ========================
export const handshakeCodes = pgTable('handshake_codes', {
  id: text('id').primaryKey(),
  applicationId: text('application_id').notNull().references(() => transfers.id),
  partyRole: text('party_role').notNull(),
  codeHash: text('code_hash').notNull(),
  expiresAt: text('expires_at').notNull(),
  attemptsUsed: integer('attempts_used').default(0),
  verifiedAt: text('verified_at'),
  isActive: boolean('is_active').default(true),
  createdAt: text('created_at').notNull(),
});

// ========================
// Transfer Documents
// ========================
export const transferDocuments = pgTable('transfer_documents', {
  id: text('id').primaryKey(),
  applicationId: text('application_id').notNull().references(() => transfers.id),
  documentType: text('document_type').notNull(),
  fileName: text('file_name').notNull(),
  filePath: text('file_path').notNull(),
  fileSize: integer('file_size').notNull(),
  mimeType: text('mime_type').notNull(),
  fileHash: text('file_hash').notNull(),
  uploadedBy: text('uploaded_by').notNull(),
  createdAt: text('created_at').notNull(),
});

// ========================
// Digital Signatures (§8.2 Stage 8)
// ========================
export const signatures = pgTable('signatures', {
  id: text('id').primaryKey(),
  applicationId: text('application_id').notNull().references(() => transfers.id),
  signerId: text('signer_id').notNull(),
  signerRole: text('signer_role').notNull(),
  documentHash: text('document_hash').notNull(),
  signedAt: text('signed_at').notNull(),
  ipAddress: text('ip_address'),
  deviceFingerprint: text('device_fingerprint'),
  isValid: boolean('is_valid').default(true),
  invalidatedAt: text('invalidated_at'),
  invalidationReason: text('invalidation_reason'),
  createdAt: text('created_at').notNull(),
});

// ========================
// TOC Signatures
// ========================
export const tocSignatures = pgTable('toc_signatures', {
  id: text('id').primaryKey(),
  transferId: text('transfer_id').notNull().references(() => transfers.id),
  citizenId: text('citizen_id').notNull().references(() => citizens.id),
  role: text('role').notNull(),
  digitalSignature: text('digital_signature'),
  physicalUploadData: text('physical_upload_data'),
  signedAt: text('signed_at'),
  createdAt: text('created_at').notNull(),
});

// ========================
// Land Transactions (§8.2 Stage 9)
// ========================
export const landTransactions = pgTable('land_transactions', {
  id: text('id').primaryKey(),
  applicationId: text('application_id').notNull().references(() => transfers.id),
  parcelId: text('parcel_id').notNull().references(() => parcels.id),
  fromOwnerId: text('from_owner_id').notNull().references(() => citizens.id),
  toOwnerId: text('to_owner_id').notNull().references(() => citizens.id),
  transferType: text('transfer_type').notNull(),
  considerationAmount: doublePrecision('consideration_amount'),
  feesPaid: text('fees_paid'),
  sdoOrderReference: text('sdo_order_reference'),
  effectiveDate: text('effective_date').notNull(),
  createdAt: text('created_at').notNull(),
});

// ========================
// Correction Requests (§6.3)
// ========================
export const correctionRequests = pgTable('correction_requests', {
  id: text('id').primaryKey(),
  parcelId: text('parcel_id').notNull().references(() => parcels.id),
  requesterId: text('requester_id').notNull(),
  requesterType: text('requester_type').notNull(),
  field: text('field').notNull(),
  currentValue: text('current_value').notNull(),
  proposedValue: text('proposed_value').notNull(),
  reason: text('reason').notNull(),
  evidenceDocs: text('evidence_docs'),
  status: text('status').notNull().default('RAISED'),
  endorsedBy: text('endorsed_by'),
  endorsedAt: text('endorsed_at'),
  dispatchedBy: text('dispatched_by'),
  dispatchedAt: text('dispatched_at'),
  resolvedAt: text('resolved_at'),
  resolutionNote: text('resolution_note'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ========================
// Notifications
// ========================
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey(),
  recipientId: text('recipient_id').notNull(),
  recipientType: text('recipient_type').notNull(),
  templateId: text('template_id').notNull(),
  channel: text('channel').notNull(),
  subject: text('subject'),
  body: text('body').notNull(),
  metadata: text('metadata'),
  readAt: text('read_at'),
  deliveredAt: text('delivered_at'),
  createdAt: text('created_at').notNull(),
});

// ========================
// Audit Log (§11) — APPEND-ONLY
// ========================
export const auditLog = pgTable('audit_log', {
  id: serial('id').primaryKey(),
  actorId: text('actor_id'),
  actorType: text('actor_type').notNull(),
  actorRoleCode: text('actor_role_code'),
  actorJurisdictionId: text('actor_jurisdiction_id'),
  action: text('action').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  previousStatus: text('previous_status'),
  newStatus: text('new_status'),
  reason: text('reason'),
  metadata: text('metadata'),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  chainHash: text('chain_hash'),
  createdAt: text('created_at').notNull(),
});

// ========================
// Land Taxes (Khajana)
// ========================
export const landTaxes = pgTable('land_taxes', {
  id: text('id').primaryKey(),
  parcelId: text('parcel_id').notNull().references(() => parcels.id),
  citizenId: text('citizen_id').notNull().references(() => citizens.id),
  financialYear: text('financial_year').notNull(),
  baseLiability: doublePrecision('base_liability').notNull(),
  accumulatedArrears: doublePrecision('accumulated_arrears').default(0),
  lateSurcharges: doublePrecision('late_surcharges').default(0),
  totalOutstanding: doublePrecision('total_outstanding').notNull(),
  status: text('status').notNull().default('PENDING'),
  dueDate: text('due_date').notNull(),
  paidAt: text('paid_at'),
  paymentMode: text('payment_mode'),
  receiptNumber: text('receipt_number'),
  collectedBy: text('collected_by').references(() => officers.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ========================
// Dev Outbox
// ========================
export const devOutbox = pgTable('dev_outbox', {
  id: serial('id').primaryKey(),
  type: text('type').notNull(),
  destination: text('destination').notNull(),
  subject: text('subject'),
  body: text('body').notNull(),
  metadata: text('metadata'),
  createdAt: text('created_at').notNull(),
});

// ========================
// Rate Limiting
// ========================
export const rateLimits = pgTable('rate_limits', {
  id: text('id').primaryKey(),
  key: text('key').notNull(),
  count: integer('count').notNull().default(0),
  windowStart: text('window_start').notNull(),
  windowDurationMs: integer('window_duration_ms').notNull(),
  createdAt: text('created_at').notNull(),
});

// ========================
// Land Disputes
// ========================
export const landDisputes = pgTable('land_disputes', {
  id: text('id').primaryKey(),
  disputeUid: text('dispute_uid').notNull().unique(),
  parcelId: text('parcel_id').notNull().references(() => parcels.id),
  complainantId: text('complainant_id').notNull().references(() => citizens.id),
  category: text('category').notNull(),
  description: text('description').notNull(),
  status: text('status').notNull().default('OPEN'),
  resolutionNotes: text('resolution_notes'),
  assignedOfficerId: text('assigned_officer_id').references(() => officers.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ========================
// NOC Signatures
// ========================
export const nocSignatures = pgTable('noc_signatures', {
  id: text('id').primaryKey(),
  transferId: text('transfer_id').notNull().references(() => transfers.id),
  signerId: text('signer_id').notNull().references(() => citizens.id),
  signerRole: text('signer_role').notNull(),
  signedAt: text('signed_at'),
  signatureHash: text('signature_hash'),
  ipAddress: text('ip_address'),
  createdAt: text('created_at').notNull(),
});
