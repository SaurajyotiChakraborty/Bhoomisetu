// Bhoomisetu — Database Schema
// All tables defined using Drizzle ORM for SQLite (local) compatibility

import { sqliteTable, text, integer, real, AnySQLiteColumn } from 'drizzle-orm/sqlite-core';

// ========================
// Jurisdictions — Materialised-path tree (§4.3)
// ========================
export const jurisdictions = sqliteTable('jurisdictions', {
  id: text('id').primaryKey(),                            // UUID
  code: text('code').notNull().unique(),                  // e.g. 'AS.UPPER_ASSAM.SONITPUR'
  name: text('name').notNull(),                           // e.g. 'Sonitpur'
  type: text('type').notNull(),                           // DIVISION | DISTRICT | SUBDIVISION | TEHSIL | CIRCLE | VILLAGE
  parentId: text('parent_id').references((): AnySQLiteColumn => jurisdictions.id),
  path: text('path').notNull(),                           // materialised path: 'AS.UPPER_ASSAM.SONITPUR.TEZPUR'
  geometry: text('geometry'),                             // GeoJSON MultiPolygon (stored as text in SQLite)
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ========================
// Roles (§4.2)
// ========================
export const roles = sqliteTable('roles', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),                  // DIV_COMM, DIST_COLL, etc.
  name: text('name').notNull(),
  level: integer('level').notNull(),                      // 1 = highest authority
  scope: text('scope').notNull(),                         // DIVISION, DISTRICT, etc.
  dashboardRoute: text('dashboard_route').notNull(),
  allowsMultiple: integer('allows_multiple', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull(),
});

// ========================
// Permissions (§4.4)
// ========================
export const permissions = sqliteTable('permissions', {
  id: text('id').primaryKey(),
  code: text('code').notNull().unique(),                  // e.g. 'application.view'
  family: text('family').notNull(),                       // 'WORKFLOW' | 'SOURCE_DATA'
  description: text('description'),
  createdAt: text('created_at').notNull(),
});

export const rolePermissions = sqliteTable('role_permissions', {
  id: text('id').primaryKey(),
  roleCode: text('role_code').notNull(),
  permissionCode: text('permission_code').notNull(),
  createdAt: text('created_at').notNull(),
});

// ========================
// Citizens (§3.2)
// ========================
export const citizens = sqliteTable('citizens', {
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
  mustChangePassword: integer('must_change_password', { mode: 'boolean' }).default(false),
  failedLoginAttempts: integer('failed_login_attempts').default(0),
  lockedUntil: text('locked_until'),
  passwordHistory: text('password_history'),              // JSON array of last 5 hashes
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ========================
// Officers (§3.4)
// ========================
export const officers = sqliteTable('officers', {
  id: text('id').primaryKey(),
  officerUid: text('officer_uid').notNull().unique(),     // BSO-TEH-AS0905-000231 — IMMUTABLE
  fullName: text('full_name').notNull(),
  email: text('email').notNull().unique(),
  mobile: text('mobile').notNull(),
  roleCode: text('role_code').notNull(),
  jurisdictionId: text('jurisdiction_id').notNull().references(() => jurisdictions.id),
  passwordHash: text('password_hash').notNull(),
  status: text('status').notNull().default('ACTIVE'),
  mustChangePassword: integer('must_change_password', { mode: 'boolean' }).default(true),
  tempPasswordExpiresAt: text('temp_password_expires_at'),
  failedLoginAttempts: integer('failed_login_attempts').default(0),
  lockedUntil: text('locked_until'),
  passwordHistory: text('password_history'),
  appointedBy: text('appointed_by'),                      // officer ID who appointed this one
  effectiveFrom: text('effective_from').notNull(),
  effectiveTo: text('effective_to'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ========================
// Officer Appointments (§5)
// ========================
export const officerAppointments = sqliteTable('officer_appointments', {
  id: text('id').primaryKey(),
  officerId: text('officer_id').notNull().references(() => officers.id),
  appointedBy: text('appointed_by').notNull(),            // appointing officer ID
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
export const otps = sqliteTable('otps', {
  id: text('id').primaryKey(),
  destination: text('destination').notNull(),              // email or phone
  channel: text('channel').notNull(),                     // EMAIL | SMS
  purpose: text('purpose').notNull(),                     // REGISTRATION | FORGOT_PASSWORD | VERIFICATION
  codeHash: text('code_hash').notNull(),                  // Argon2id hash of the OTP
  expiresAt: text('expires_at').notNull(),
  attempts: integer('attempts').default(0),
  maxAttempts: integer('max_attempts').default(5),
  verifiedAt: text('verified_at'),
  invalidated: integer('invalidated', { mode: 'boolean' }).default(false),
  ipAddress: text('ip_address'),
  createdAt: text('created_at').notNull(),
});

// ========================
// Parcels (§6.1)
// ========================
export const parcels = sqliteTable('parcels', {
  id: text('id').primaryKey(),                            // UUID
  parcelUid: text('parcel_uid').notNull().unique(),       // AS-SONITPUR-TEZPUR-BORGHAT-114-2A
  state: text('state').notNull(),
  district: text('district').notNull(),
  subdivision: text('subdivision').notNull(),
  tehsil: text('tehsil').notNull(),
  circle: text('circle').notNull(),
  village: text('village').notNull(),
  jurisdictionId: text('jurisdiction_id').notNull().references(() => jurisdictions.id),
  surveyNumber: text('survey_number').notNull(),          // dag / khasra number — PROTECTED
  subdivisionNumber: text('subdivision_number'),          // PROTECTED
  pattaNumber: text('patta_number'),                      // PROTECTED
  khatianNumber: text('khatian_number'),
  landType: text('land_type').notNull(),                  // LandType enum
  landClass: text('land_class'),
  areaDeclaredSqm: real('area_declared_sqm').notNull(),   // PROTECTED — as on gov record
  areaComputedSqm: real('area_computed_sqm'),             // computed from geometry
  geometry: text('geometry'),                             // GeoJSON Polygon (text in SQLite) — PROTECTED
  boundaryNorth: text('boundary_north'),
  boundarySouth: text('boundary_south'),
  boundaryEast: text('boundary_east'),
  boundaryWest: text('boundary_west'),
  currentOwnerId: text('current_owner_id').references(() => citizens.id),
  ownershipType: text('ownership_type').notNull(),        // SOLE | JOINT | INHERITED | LEASE
  encumbranceStatus: text('encumbrance_status').notNull().default('CLEAR'),
  sourceAuthority: text('source_authority'),
  sourceRecordHash: text('source_record_hash'),           // SHA-256 of canonical source — PROTECTED
  sourceFetchedAt: text('source_fetched_at'),
  isLocked: integer('is_locked', { mode: 'boolean' }).default(true),
  derivedFromParcelId: text('derived_from_parcel_id'),    // for partial transfers
  pendingSourceConfirmation: integer('pending_source_confirmation', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ========================
// Ownership History (§7.3) — APPEND-ONLY
// ========================
export const ownershipHistory = sqliteTable('ownership_history', {
  id: text('id').primaryKey(),
  parcelId: text('parcel_id').notNull().references(() => parcels.id),
  fromOwnerId: text('from_owner_id'),                    // null for initial registration
  toOwnerId: text('to_owner_id').notNull().references(() => citizens.id),
  transferType: text('transfer_type').notNull(),
  transferDate: text('transfer_date').notNull(),
  applicationId: text('application_id'),                  // references transfers
  approvingOfficerId: text('approving_officer_id'),
  registrationReference: text('registration_reference'),
  consideration: real('consideration'),
  createdAt: text('created_at').notNull(),
});

// ========================
// Transfer Applications (§8)
// ========================
export const transfers = sqliteTable('transfers', {
  id: text('id').primaryKey(),
  applicationUid: text('application_uid').notNull().unique(), // LTA-2026-XXXXXXXX
  parcelId: text('parcel_id').notNull().references(() => parcels.id),
  sellerId: text('seller_id').notNull().references(() => citizens.id),
  buyerId: text('buyer_id').notNull().references(() => citizens.id),
  transferType: text('transfer_type').notNull(),          // SALE | GIFT | INHERITANCE | PARTITION | EXCHANGE
  considerationAmount: real('consideration_amount'),
  isPartialTransfer: integer('is_partial_transfer', { mode: 'boolean' }).default(false),
  partialArea: real('partial_area'),
  partialGeometry: text('partial_geometry'),               // GeoJSON for sub-division
  status: text('status').notNull().default('DRAFT'),
  heldFromStatus: text('held_from_status'),               // for ON_HOLD resume
  returnedByRole: text('returned_by_role'),
  returnedTo: text('returned_to'),                        // CITIZEN | prior officer role
  rejectionReason: text('rejection_reason'),
  cancellationReason: text('cancellation_reason'),
  // Handshake tracking
  handshakeVerifiedAt: text('handshake_verified_at'),
  handshakeAttempts: integer('handshake_attempts').default(0),
  handshakeResendsUsed: integer('handshake_resends_used').default(0),
  // Verification data
  circleVerificationData: text('circle_verification_data'),   // JSON
  tehsildarVerificationData: text('tehsildar_verification_data'), // JSON
  sdoReviewData: text('sdo_review_data'),                 // JSON
  // Fee verification
  feeVerificationData: text('fee_verification_data'),     // JSON
  // Approval
  sdoApprovalNote: text('sdo_approval_note'),
  sdoApprovalReference: text('sdo_approval_reference'),
  approvedAt: text('approved_at'),
  // Declaration
  declarationDocumentHash: text('declaration_document_hash'),
  declarationGeneratedAt: text('declaration_generated_at'),
  // Completion
  completedAt: text('completed_at'),
  // Tracking
  currentOfficerId: text('current_officer_id'),           // which officer has the case
  currentJurisdictionId: text('current_jurisdiction_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ========================
// Handshake Codes (§8.2 Stage 3)
// ========================
export const handshakeCodes = sqliteTable('handshake_codes', {
  id: text('id').primaryKey(),
  applicationId: text('application_id').notNull().references(() => transfers.id),
  partyRole: text('party_role').notNull(),                // SELLER | BUYER
  codeHash: text('code_hash').notNull(),                  // Argon2id hash
  expiresAt: text('expires_at').notNull(),
  attemptsUsed: integer('attempts_used').default(0),
  verifiedAt: text('verified_at'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  createdAt: text('created_at').notNull(),
});

// ========================
// Transfer Documents
// ========================
export const transferDocuments = sqliteTable('transfer_documents', {
  id: text('id').primaryKey(),
  applicationId: text('application_id').notNull().references(() => transfers.id),
  documentType: text('document_type').notNull(),          // SALE_AGREEMENT | IDENTITY_PROOF | TAX_RECEIPT | etc.
  fileName: text('file_name').notNull(),
  filePath: text('file_path').notNull(),                  // storage key
  fileSize: integer('file_size').notNull(),
  mimeType: text('mime_type').notNull(),
  fileHash: text('file_hash').notNull(),                  // SHA-256
  uploadedBy: text('uploaded_by').notNull(),
  createdAt: text('created_at').notNull(),
});

// ========================
// Digital Signatures (§8.2 Stage 8)
// ========================
export const signatures = sqliteTable('signatures', {
  id: text('id').primaryKey(),
  applicationId: text('application_id').notNull().references(() => transfers.id),
  signerId: text('signer_id').notNull(),                  // citizen or officer UID
  signerRole: text('signer_role').notNull(),              // SELLER | BUYER | SDO | WITNESS
  documentHash: text('document_hash').notNull(),          // SHA-256 of exact document bytes
  signedAt: text('signed_at').notNull(),
  ipAddress: text('ip_address'),
  deviceFingerprint: text('device_fingerprint'),
  isValid: integer('is_valid', { mode: 'boolean' }).default(true),
  invalidatedAt: text('invalidated_at'),
  invalidationReason: text('invalidation_reason'),
  createdAt: text('created_at').notNull(),
});

// ========================
// TOC Signatures (Tehsildar Stage)
// ========================
export const tocSignatures = sqliteTable('toc_signatures', {
  id: text('id').primaryKey(),
  transferId: text('transfer_id').notNull().references(() => transfers.id),
  citizenId: text('citizen_id').notNull().references(() => citizens.id),
  role: text('role').notNull(), // SELLER | BUYER
  digitalSignature: text('digital_signature'),
  physicalUploadData: text('physical_upload_data'),
  signedAt: text('signed_at'),
  createdAt: text('created_at').notNull(),
});

// ========================
// Land Transactions (§8.2 Stage 9)
// ========================
export const landTransactions = sqliteTable('land_transactions', {
  id: text('id').primaryKey(),
  applicationId: text('application_id').notNull().references(() => transfers.id),
  parcelId: text('parcel_id').notNull().references(() => parcels.id),
  fromOwnerId: text('from_owner_id').notNull().references(() => citizens.id),
  toOwnerId: text('to_owner_id').notNull().references(() => citizens.id),
  transferType: text('transfer_type').notNull(),
  considerationAmount: real('consideration_amount'),
  feesPaid: text('fees_paid'),                            // JSON with fee breakdown
  sdoOrderReference: text('sdo_order_reference'),
  effectiveDate: text('effective_date').notNull(),
  createdAt: text('created_at').notNull(),
});

// ========================
// Correction Requests (§6.3)
// ========================
export const correctionRequests = sqliteTable('correction_requests', {
  id: text('id').primaryKey(),
  parcelId: text('parcel_id').notNull().references(() => parcels.id),
  requesterId: text('requester_id').notNull(),
  requesterType: text('requester_type').notNull(),        // CITIZEN | OFFICER
  field: text('field').notNull(),                         // which parcel field
  currentValue: text('current_value').notNull(),
  proposedValue: text('proposed_value').notNull(),
  reason: text('reason').notNull(),
  evidenceDocs: text('evidence_docs'),                    // JSON array of file paths
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
export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey(),
  recipientId: text('recipient_id').notNull(),
  recipientType: text('recipient_type').notNull(),        // CITIZEN | OFFICER
  templateId: text('template_id').notNull(),
  channel: text('channel').notNull(),                     // IN_APP | EMAIL | SMS
  subject: text('subject'),
  body: text('body').notNull(),
  metadata: text('metadata'),                             // JSON
  readAt: text('read_at'),
  deliveredAt: text('delivered_at'),
  createdAt: text('created_at').notNull(),
});

// ========================
// Audit Log (§11) — APPEND-ONLY, no UPDATE, no DELETE
// ========================
export const auditLog = sqliteTable('audit_log', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  actorId: text('actor_id'),
  actorType: text('actor_type').notNull(),                // CITIZEN | OFFICER | SYSTEM
  actorRoleCode: text('actor_role_code'),
  actorJurisdictionId: text('actor_jurisdiction_id'),
  action: text('action').notNull(),                       // APPLICATION_FORWARDED, HANDSHAKE_VERIFIED, etc.
  entityType: text('entity_type').notNull(),              // APPLICATION | PARCEL | OFFICER | CORRECTION | SIGNATURE
  entityId: text('entity_id').notNull(),
  previousStatus: text('previous_status'),
  newStatus: text('new_status'),
  reason: text('reason'),
  metadata: text('metadata'),                             // JSON
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  chainHash: text('chain_hash'),                          // sha256(prev_chain_hash || row payload)
  createdAt: text('created_at').notNull(),
});

// ========================
// Land Taxes (Khajana)
// ========================
export const landTaxes = sqliteTable('land_taxes', {
  id: text('id').primaryKey(),
  parcelId: text('parcel_id').notNull().references(() => parcels.id),
  citizenId: text('citizen_id').notNull().references(() => citizens.id),
  financialYear: text('financial_year').notNull(),
  baseLiability: real('base_liability').notNull(),
  accumulatedArrears: real('accumulated_arrears').default(0),
  lateSurcharges: real('late_surcharges').default(0),
  totalOutstanding: real('total_outstanding').notNull(),
  status: text('status').notNull().default('PENDING'), // PAID | PENDING | DISPUTED
  dueDate: text('due_date').notNull(),
  paidAt: text('paid_at'),
  paymentMode: text('payment_mode'),
  receiptNumber: text('receipt_number'),
  collectedBy: text('collected_by').references(() => officers.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ========================
// Dev Outbox (local development only)
// ========================
export const devOutbox = sqliteTable('dev_outbox', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  type: text('type').notNull(),                           // OTP | HEX_CODE | EMAIL | SMS | NOTIFICATION
  destination: text('destination').notNull(),
  subject: text('subject'),
  body: text('body').notNull(),
  metadata: text('metadata'),                             // JSON
  createdAt: text('created_at').notNull(),
});

// ========================
// Rate Limiting
// ========================
export const rateLimits = sqliteTable('rate_limits', {
  id: text('id').primaryKey(),
  key: text('key').notNull(),                             // e.g. 'otp:email:user@example.com'
  count: integer('count').notNull().default(0),
  windowStart: text('window_start').notNull(),
  windowDurationMs: integer('window_duration_ms').notNull(),
  createdAt: text('created_at').notNull(),
});

// ========================
// Land Disputes
// ========================
export const landDisputes = sqliteTable('land_disputes', {
  id: text('id').primaryKey(),
  disputeUid: text('dispute_uid').notNull().unique(),
  parcelId: text('parcel_id').notNull().references(() => parcels.id),
  complainantId: text('complainant_id').notNull().references(() => citizens.id),
  category: text('category').notNull(),                   // BOUNDARY | OWNERSHIP | ENCROACHMENT | OTHER
  description: text('description').notNull(),
  status: text('status').notNull().default('OPEN'),       // OPEN | UNDER_INVESTIGATION | RESOLVED | DISMISSED
  resolutionNotes: text('resolution_notes'),
  assignedOfficerId: text('assigned_officer_id').references(() => officers.id),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

// ========================
// NOC Signatures
// ========================
export const nocSignatures = sqliteTable('noc_signatures', {
  id: text('id').primaryKey(),
  transferId: text('transfer_id').notNull().references(() => transfers.id),
  signerId: text('signer_id').notNull().references(() => citizens.id),
  signerRole: text('signer_role').notNull(),              // SELLER | BUYER | CO_OWNER
  signedAt: text('signed_at'),
  signatureHash: text('signature_hash'),
  ipAddress: text('ip_address'),
  createdAt: text('created_at').notNull(),
});

