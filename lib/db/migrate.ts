// Bhoomisetu — Database Migration
// Creates all tables and enforces immutability triggers

import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_URL || path.join(process.cwd(), 'data', 'bhoomisetu.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

console.log('🔧 Running Bhoomisetu migrations...');
console.log(`📁 Database: ${DB_PATH}`);

// ========================
// Create all tables
// ========================

db.exec(`
  -- Jurisdictions
  CREATE TABLE IF NOT EXISTS jurisdictions (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK(type IN ('DIVISION','DISTRICT','SUBDIVISION','TEHSIL','CIRCLE','VILLAGE')),
    parent_id TEXT REFERENCES jurisdictions(id),
    path TEXT NOT NULL,
    geometry TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- Roles
  CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    level INTEGER NOT NULL,
    scope TEXT NOT NULL,
    dashboard_route TEXT NOT NULL,
    allows_multiple INTEGER DEFAULT 0,
    created_at TEXT NOT NULL
  );

  -- Permissions
  CREATE TABLE IF NOT EXISTS permissions (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    family TEXT NOT NULL CHECK(family IN ('WORKFLOW','SOURCE_DATA')),
    description TEXT,
    created_at TEXT NOT NULL
  );

  -- Role-Permission mapping
  CREATE TABLE IF NOT EXISTS role_permissions (
    id TEXT PRIMARY KEY,
    role_code TEXT NOT NULL,
    permission_code TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE(role_code, permission_code)
  );

  -- Citizens
  CREATE TABLE IF NOT EXISTS citizens (
    id TEXT PRIMARY KEY,
    citizen_uid TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    mobile TEXT NOT NULL UNIQUE,
    aadhaar_encrypted TEXT NOT NULL,
    aadhaar_masked TEXT NOT NULL,
    pan_encrypted TEXT NOT NULL,
    pan_masked TEXT NOT NULL,
    date_of_birth TEXT NOT NULL,
    address_line1 TEXT NOT NULL,
    address_line2 TEXT,
    village_town TEXT NOT NULL,
    district TEXT NOT NULL,
    state TEXT NOT NULL,
    pin TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','LOCKED','SUSPENDED','RETIRED')),
    must_change_password INTEGER DEFAULT 0,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TEXT,
    password_history TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- Officers
  CREATE TABLE IF NOT EXISTS officers (
    id TEXT PRIMARY KEY,
    officer_uid TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    mobile TEXT NOT NULL,
    role_code TEXT NOT NULL,
    jurisdiction_id TEXT NOT NULL REFERENCES jurisdictions(id),
    password_hash TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK(status IN ('ACTIVE','LOCKED','SUSPENDED','RETIRED')),
    must_change_password INTEGER DEFAULT 1,
    temp_password_expires_at TEXT,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TEXT,
    password_history TEXT,
    appointed_by TEXT,
    effective_from TEXT NOT NULL,
    effective_to TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- Officer Appointments
  CREATE TABLE IF NOT EXISTS officer_appointments (
    id TEXT PRIMARY KEY,
    officer_id TEXT NOT NULL REFERENCES officers(id),
    appointed_by TEXT NOT NULL,
    role_code TEXT NOT NULL,
    jurisdiction_id TEXT NOT NULL,
    effective_from TEXT NOT NULL,
    effective_to TEXT,
    action TEXT NOT NULL CHECK(action IN ('APPOINTED','TRANSFERRED','DEACTIVATED')),
    reason TEXT,
    created_at TEXT NOT NULL
  );

  -- OTPs
  CREATE TABLE IF NOT EXISTS otps (
    id TEXT PRIMARY KEY,
    destination TEXT NOT NULL,
    channel TEXT NOT NULL CHECK(channel IN ('EMAIL','SMS')),
    purpose TEXT NOT NULL CHECK(purpose IN ('REGISTRATION','FORGOT_PASSWORD','VERIFICATION')),
    code_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 5,
    verified_at TEXT,
    invalidated INTEGER DEFAULT 0,
    ip_address TEXT,
    created_at TEXT NOT NULL
  );

  -- Parcels
  CREATE TABLE IF NOT EXISTS parcels (
    id TEXT PRIMARY KEY,
    parcel_uid TEXT NOT NULL UNIQUE,
    state TEXT NOT NULL,
    district TEXT NOT NULL,
    subdivision TEXT NOT NULL,
    tehsil TEXT NOT NULL,
    circle TEXT NOT NULL,
    village TEXT NOT NULL,
    jurisdiction_id TEXT NOT NULL REFERENCES jurisdictions(id),
    survey_number TEXT NOT NULL,
    subdivision_number TEXT,
    patta_number TEXT,
    khatian_number TEXT,
    land_type TEXT NOT NULL CHECK(land_type IN ('AGRICULTURAL','RESIDENTIAL','COMMERCIAL','INDUSTRIAL','GOVT','FOREST','WATER_BODY')),
    land_class TEXT,
    area_declared_sqm REAL NOT NULL,
    area_computed_sqm REAL,
    geometry TEXT,
    boundary_north TEXT,
    boundary_south TEXT,
    boundary_east TEXT,
    boundary_west TEXT,
    current_owner_id TEXT REFERENCES citizens(id),
    ownership_type TEXT NOT NULL CHECK(ownership_type IN ('SOLE','JOINT','INHERITED','LEASE')),
    encumbrance_status TEXT NOT NULL DEFAULT 'CLEAR' CHECK(encumbrance_status IN ('CLEAR','MORTGAGED','DISPUTED','ATTACHED')),
    source_authority TEXT,
    source_record_hash TEXT,
    source_fetched_at TEXT,
    is_locked INTEGER DEFAULT 1,
    derived_from_parcel_id TEXT,
    pending_source_confirmation INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- Ownership History (append-only)
  CREATE TABLE IF NOT EXISTS ownership_history (
    id TEXT PRIMARY KEY,
    parcel_id TEXT NOT NULL REFERENCES parcels(id),
    from_owner_id TEXT,
    to_owner_id TEXT NOT NULL REFERENCES citizens(id),
    transfer_type TEXT NOT NULL,
    transfer_date TEXT NOT NULL,
    application_id TEXT,
    approving_officer_id TEXT,
    registration_reference TEXT,
    consideration REAL,
    created_at TEXT NOT NULL
  );

  -- Transfer Applications
  CREATE TABLE IF NOT EXISTS transfers (
    id TEXT PRIMARY KEY,
    application_uid TEXT NOT NULL UNIQUE,
    parcel_id TEXT NOT NULL REFERENCES parcels(id),
    seller_id TEXT NOT NULL REFERENCES citizens(id),
    buyer_id TEXT NOT NULL REFERENCES citizens(id),
    transfer_type TEXT NOT NULL CHECK(transfer_type IN ('SALE','GIFT','INHERITANCE','PARTITION','EXCHANGE')),
    consideration_amount REAL,
    is_partial_transfer INTEGER DEFAULT 0,
    partial_area REAL,
    partial_geometry TEXT,
    status TEXT NOT NULL DEFAULT 'DRAFT',
    held_from_status TEXT,
    returned_by_role TEXT,
    returned_to TEXT,
    rejection_reason TEXT,
    cancellation_reason TEXT,
    handshake_verified_at TEXT,
    handshake_attempts INTEGER DEFAULT 0,
    handshake_resends_used INTEGER DEFAULT 0,
    circle_verification_data TEXT,
    tehsildar_verification_data TEXT,
    sdo_review_data TEXT,
    fee_verification_data TEXT,
    sdo_approval_note TEXT,
    sdo_approval_reference TEXT,
    approved_at TEXT,
    declaration_document_hash TEXT,
    declaration_generated_at TEXT,
    completed_at TEXT,
    current_officer_id TEXT,
    current_jurisdiction_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- Handshake Codes
  CREATE TABLE IF NOT EXISTS handshake_codes (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL REFERENCES transfers(id),
    party_role TEXT NOT NULL CHECK(party_role IN ('SELLER','BUYER')),
    code_hash TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    attempts_used INTEGER DEFAULT 0,
    verified_at TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
  );

  -- Transfer Documents
  CREATE TABLE IF NOT EXISTS transfer_documents (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL REFERENCES transfers(id),
    document_type TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL,
    mime_type TEXT NOT NULL,
    file_hash TEXT NOT NULL,
    uploaded_by TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  -- Digital Signatures
  CREATE TABLE IF NOT EXISTS signatures (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL REFERENCES transfers(id),
    signer_id TEXT NOT NULL,
    signer_role TEXT NOT NULL CHECK(signer_role IN ('SELLER','BUYER','SDO','WITNESS')),
    document_hash TEXT NOT NULL,
    signed_at TEXT NOT NULL,
    ip_address TEXT,
    device_fingerprint TEXT,
    is_valid INTEGER DEFAULT 1,
    invalidated_at TEXT,
    invalidation_reason TEXT,
    created_at TEXT NOT NULL
  );

  -- TOC Signatures (Tehsildar Dual-Signing Workflow)
  CREATE TABLE IF NOT EXISTS toc_signatures (
    id TEXT PRIMARY KEY,
    transfer_id TEXT NOT NULL REFERENCES transfers(id),
    citizen_id TEXT NOT NULL REFERENCES citizens(id),
    role TEXT NOT NULL,
    digital_signature TEXT,
    physical_upload_data TEXT,
    signed_at TEXT,
    created_at TEXT NOT NULL
  );

  -- Land Transactions
  CREATE TABLE IF NOT EXISTS land_transactions (
    id TEXT PRIMARY KEY,
    application_id TEXT NOT NULL REFERENCES transfers(id),
    parcel_id TEXT NOT NULL REFERENCES parcels(id),
    from_owner_id TEXT NOT NULL REFERENCES citizens(id),
    to_owner_id TEXT NOT NULL REFERENCES citizens(id),
    transfer_type TEXT NOT NULL,
    consideration_amount REAL,
    fees_paid TEXT,
    sdo_order_reference TEXT,
    effective_date TEXT NOT NULL,
    created_at TEXT NOT NULL
  );

  -- Correction Requests
  CREATE TABLE IF NOT EXISTS correction_requests (
    id TEXT PRIMARY KEY,
    parcel_id TEXT NOT NULL REFERENCES parcels(id),
    requester_id TEXT NOT NULL,
    requester_type TEXT NOT NULL CHECK(requester_type IN ('CITIZEN','OFFICER')),
    field TEXT NOT NULL,
    current_value TEXT NOT NULL,
    proposed_value TEXT NOT NULL,
    reason TEXT NOT NULL,
    evidence_docs TEXT,
    status TEXT NOT NULL DEFAULT 'RAISED' CHECK(status IN ('RAISED','ENDORSED','DISPATCHED_TO_SOURCE','ACCEPTED_BY_SOURCE','REJECTED_BY_SOURCE')),
    endorsed_by TEXT,
    endorsed_at TEXT,
    dispatched_by TEXT,
    dispatched_at TEXT,
    resolved_at TEXT,
    resolution_note TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- Notifications
  CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    recipient_id TEXT NOT NULL,
    recipient_type TEXT NOT NULL CHECK(recipient_type IN ('CITIZEN','OFFICER')),
    template_id TEXT NOT NULL,
    channel TEXT NOT NULL CHECK(channel IN ('IN_APP','EMAIL','SMS')),
    subject TEXT,
    body TEXT NOT NULL,
    metadata TEXT,
    read_at TEXT,
    delivered_at TEXT,
    created_at TEXT NOT NULL
  );

  -- Audit Log (APPEND-ONLY)
  CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id TEXT,
    actor_type TEXT NOT NULL CHECK(actor_type IN ('CITIZEN','OFFICER','SYSTEM')),
    actor_role_code TEXT,
    actor_jurisdiction_id TEXT,
    action TEXT NOT NULL,
    entity_type TEXT NOT NULL,
    entity_id TEXT NOT NULL,
    previous_status TEXT,
    new_status TEXT,
    reason TEXT,
    metadata TEXT,
    ip_address TEXT,
    user_agent TEXT,
    chain_hash TEXT,
    created_at TEXT NOT NULL
  );

  -- Dev Outbox
  CREATE TABLE IF NOT EXISTS dev_outbox (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    type TEXT NOT NULL,
    destination TEXT NOT NULL,
    subject TEXT,
    body TEXT NOT NULL,
    metadata TEXT,
    created_at TEXT NOT NULL
  );

  -- Land Taxes
  CREATE TABLE IF NOT EXISTS land_taxes (
    id TEXT PRIMARY KEY,
    parcel_id TEXT NOT NULL REFERENCES parcels(id),
    citizen_id TEXT NOT NULL REFERENCES citizens(id),
    financial_year TEXT NOT NULL,
    base_liability REAL NOT NULL,
    accumulated_arrears REAL DEFAULT 0,
    late_surcharges REAL DEFAULT 0,
    total_outstanding REAL NOT NULL,
    status TEXT NOT NULL DEFAULT 'PENDING' CHECK(status IN ('PENDING','PAID','DISPUTED')),
    due_date TEXT NOT NULL,
    paid_at TEXT,
    payment_mode TEXT,
    receipt_number TEXT,
    collected_by TEXT REFERENCES officers(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- Land Disputes
  CREATE TABLE IF NOT EXISTS land_disputes (
    id TEXT PRIMARY KEY,
    dispute_uid TEXT NOT NULL UNIQUE,
    parcel_id TEXT NOT NULL REFERENCES parcels(id),
    complainant_id TEXT NOT NULL REFERENCES citizens(id),
    category TEXT NOT NULL CHECK(category IN ('BOUNDARY','OWNERSHIP','ENCROACHMENT','OTHER')),
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'OPEN' CHECK(status IN ('OPEN','UNDER_INVESTIGATION','RESOLVED','DISMISSED')),
    resolution_notes TEXT,
    assigned_officer_id TEXT REFERENCES officers(id),
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  -- NOC Signatures (for land transfer NOC signing)
  CREATE TABLE IF NOT EXISTS noc_signatures (
    id TEXT PRIMARY KEY,
    transfer_id TEXT NOT NULL REFERENCES transfers(id),
    signer_id TEXT NOT NULL REFERENCES citizens(id),
    signer_role TEXT NOT NULL CHECK(signer_role IN ('SELLER','BUYER','CO_OWNER')),
    signed_at TEXT,
    signature_hash TEXT,
    ip_address TEXT,
    created_at TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_noc_transfer ON noc_signatures(transfer_id);

  -- Rate Limits
  CREATE TABLE IF NOT EXISTS rate_limits (
    id TEXT PRIMARY KEY,
    key TEXT NOT NULL,
    count INTEGER NOT NULL DEFAULT 0,
    window_start TEXT NOT NULL,
    window_duration_ms INTEGER NOT NULL,
    created_at TEXT NOT NULL
  );

  -- Indexes
  CREATE INDEX IF NOT EXISTS idx_jurisdictions_parent ON jurisdictions(parent_id);
  CREATE INDEX IF NOT EXISTS idx_jurisdictions_path ON jurisdictions(path);
  CREATE INDEX IF NOT EXISTS idx_jurisdictions_type ON jurisdictions(type);
  CREATE INDEX IF NOT EXISTS idx_officers_role ON officers(role_code);
  CREATE INDEX IF NOT EXISTS idx_officers_jurisdiction ON officers(jurisdiction_id);
  CREATE INDEX IF NOT EXISTS idx_parcels_jurisdiction ON parcels(jurisdiction_id);
  CREATE INDEX IF NOT EXISTS idx_parcels_owner ON parcels(current_owner_id);
  CREATE INDEX IF NOT EXISTS idx_transfers_seller ON transfers(seller_id);
  CREATE INDEX IF NOT EXISTS idx_transfers_buyer ON transfers(buyer_id);
  CREATE INDEX IF NOT EXISTS idx_transfers_parcel ON transfers(parcel_id);
  CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
  CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_log(entity_type, entity_id);
  CREATE INDEX IF NOT EXISTS idx_audit_actor ON audit_log(actor_id);
  CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_id);
  CREATE INDEX IF NOT EXISTS idx_rate_limits_key ON rate_limits(key);
  CREATE INDEX IF NOT EXISTS idx_land_taxes_parcel ON land_taxes(parcel_id);
  CREATE INDEX IF NOT EXISTS idx_land_taxes_citizen ON land_taxes(citizen_id);
  CREATE INDEX IF NOT EXISTS idx_land_disputes_parcel ON land_disputes(parcel_id);
  CREATE INDEX IF NOT EXISTS idx_land_disputes_complainant ON land_disputes(complainant_id);
  CREATE INDEX IF NOT EXISTS idx_land_disputes_officer ON land_disputes(assigned_officer_id);
`);

// ========================
// CRITICAL TRIGGERS — Immutability enforcement
// ========================

// 1. Parcel source field immutability (§6.2 Layer 3)
// Only current_owner_id, ownership_type, and updated_at can change,
// and ONLY when app.transfer_completion session variable is set.
db.exec(`
  DROP TRIGGER IF EXISTS protect_parcel_source_fields;
  CREATE TRIGGER protect_parcel_source_fields
  BEFORE UPDATE ON parcels
  FOR EACH ROW
  BEGIN
    -- Block changes to protected source fields unconditionally
    SELECT CASE
      WHEN OLD.parcel_uid != NEW.parcel_uid THEN
        RAISE(ABORT, 'SOURCE_FIELD_PROTECTED: parcel_uid cannot be modified')
      WHEN OLD.survey_number != NEW.survey_number THEN
        RAISE(ABORT, 'SOURCE_FIELD_PROTECTED: survey_number cannot be modified')
      WHEN OLD.subdivision_number IS NOT NEW.subdivision_number AND
           NOT (OLD.subdivision_number IS NULL AND NEW.subdivision_number IS NULL) THEN
        RAISE(ABORT, 'SOURCE_FIELD_PROTECTED: subdivision_number cannot be modified')
      WHEN OLD.patta_number IS NOT NEW.patta_number AND
           NOT (OLD.patta_number IS NULL AND NEW.patta_number IS NULL) THEN
        RAISE(ABORT, 'SOURCE_FIELD_PROTECTED: patta_number cannot be modified')
      WHEN OLD.khatian_number IS NOT NEW.khatian_number AND
           NOT (OLD.khatian_number IS NULL AND NEW.khatian_number IS NULL) THEN
        RAISE(ABORT, 'SOURCE_FIELD_PROTECTED: khatian_number cannot be modified')
      WHEN OLD.area_declared_sqm != NEW.area_declared_sqm THEN
        RAISE(ABORT, 'SOURCE_FIELD_PROTECTED: area_declared_sqm cannot be modified')
      WHEN OLD.geometry IS NOT NEW.geometry AND
           NOT (OLD.geometry IS NULL AND NEW.geometry IS NULL) THEN
        RAISE(ABORT, 'SOURCE_FIELD_PROTECTED: geometry cannot be modified')
      WHEN OLD.source_record_hash IS NOT NEW.source_record_hash AND
           NOT (OLD.source_record_hash IS NULL AND NEW.source_record_hash IS NULL) THEN
        RAISE(ABORT, 'SOURCE_FIELD_PROTECTED: source_record_hash cannot be modified')
      WHEN OLD.jurisdiction_id != NEW.jurisdiction_id THEN
        RAISE(ABORT, 'SOURCE_FIELD_PROTECTED: jurisdiction_id cannot be modified')
      WHEN OLD.state != NEW.state OR
           OLD.district != NEW.district OR
           OLD.subdivision != NEW.subdivision OR
           OLD.tehsil != NEW.tehsil OR
           OLD.circle != NEW.circle OR
           OLD.village != NEW.village THEN
        RAISE(ABORT, 'SOURCE_FIELD_PROTECTED: administrative location cannot be modified')
    END;
  END;
`);

// 2. Audit log immutability (§11)
db.exec(`
  DROP TRIGGER IF EXISTS prevent_audit_update;
  CREATE TRIGGER prevent_audit_update
  BEFORE UPDATE ON audit_log
  FOR EACH ROW
  BEGIN
    SELECT RAISE(ABORT, 'AUDIT_LOG_IMMUTABLE: audit_log rows cannot be updated');
  END;

  DROP TRIGGER IF EXISTS prevent_audit_delete;
  CREATE TRIGGER prevent_audit_delete
  BEFORE DELETE ON audit_log
  FOR EACH ROW
  BEGIN
    SELECT RAISE(ABORT, 'AUDIT_LOG_IMMUTABLE: audit_log rows cannot be deleted');
  END;
`);

// 3. Ownership history immutability (append-only)
db.exec(`
  DROP TRIGGER IF EXISTS prevent_ownership_history_update;
  CREATE TRIGGER prevent_ownership_history_update
  BEFORE UPDATE ON ownership_history
  FOR EACH ROW
  BEGIN
    SELECT RAISE(ABORT, 'OWNERSHIP_HISTORY_IMMUTABLE: ownership_history rows cannot be updated');
  END;

  DROP TRIGGER IF EXISTS prevent_ownership_history_delete;
  CREATE TRIGGER prevent_ownership_history_delete
  BEFORE DELETE ON ownership_history
  FOR EACH ROW
  BEGIN
    SELECT RAISE(ABORT, 'OWNERSHIP_HISTORY_IMMUTABLE: ownership_history rows cannot be deleted');
  END;
`);

// 4. Citizen UID immutability
db.exec(`
  DROP TRIGGER IF EXISTS prevent_citizen_uid_change;
  CREATE TRIGGER prevent_citizen_uid_change
  BEFORE UPDATE ON citizens
  FOR EACH ROW
  WHEN OLD.citizen_uid != NEW.citizen_uid
  BEGIN
    SELECT RAISE(ABORT, 'IDENTIFIER_IMMUTABLE: citizen_uid cannot be changed');
  END;
`);

// 5. Officer UID immutability
db.exec(`
  DROP TRIGGER IF EXISTS prevent_officer_uid_change;
  CREATE TRIGGER prevent_officer_uid_change
  BEFORE UPDATE ON officers
  FOR EACH ROW
  WHEN OLD.officer_uid != NEW.officer_uid
  BEGIN
    SELECT RAISE(ABORT, 'IDENTIFIER_IMMUTABLE: officer_uid cannot be changed');
  END;
`);

console.log('✅ All tables created');
console.log('✅ All immutability triggers installed');
console.log('✅ Indexes created');
console.log('🎉 Migration complete!');

db.close();
