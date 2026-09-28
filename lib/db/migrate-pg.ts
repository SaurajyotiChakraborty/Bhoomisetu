// Bhoomisetu — PostgreSQL Migration Script (§2, §6.2, §7.1, §11)
// Creates all tables and enforces PL/pgSQL immutability triggers for AWS RDS / PostgreSQL + PostGIS

import { Pool } from 'pg';

const PG_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/bhoomisetu';

console.log('🔧 Running Bhoomisetu PostgreSQL migrations...');
console.log(`📁 Target DB: ${PG_URL.replace(/:[^:@]*@/, ':****@')}`);

export async function runPgMigration() {
  const pool = new Pool({
    connectionString: PG_URL,
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Extensions
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
      CREATE EXTENSION IF NOT EXISTS "postgis";
    `);
    console.log('✅ PostGIS & UUID extensions verified');

    // 2. Tables & Schema
    await client.query(`
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
        allows_multiple BOOLEAN DEFAULT FALSE,
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
        must_change_password BOOLEAN DEFAULT FALSE,
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
        must_change_password BOOLEAN DEFAULT TRUE,
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
        invalidated BOOLEAN DEFAULT FALSE,
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
        land_type TEXT NOT NULL,
        land_class TEXT,
        area_declared_sqm DOUBLE PRECISION NOT NULL,
        area_computed_sqm DOUBLE PRECISION,
        geometry TEXT,
        boundary_north TEXT,
        boundary_south TEXT,
        boundary_east TEXT,
        boundary_west TEXT,
        current_owner_id TEXT REFERENCES citizens(id),
        ownership_type TEXT NOT NULL CHECK(ownership_type IN ('SOLE','JOINT','INHERITED','LEASE')),
        encumbrance_status TEXT NOT NULL DEFAULT 'CLEAR' CHECK(encumbrance_status IN ('CLEAR','MORTGAGED','DISPUTED','LOCKED')),
        source_authority TEXT,
        source_record_hash TEXT,
        source_fetched_at TEXT,
        is_locked BOOLEAN DEFAULT TRUE,
        derived_from_parcel_id TEXT,
        pending_source_confirmation BOOLEAN DEFAULT FALSE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      -- Ownership History (APPEND-ONLY)
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
        consideration DOUBLE PRECISION,
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
        consideration_amount DOUBLE PRECISION,
        is_partial_transfer BOOLEAN DEFAULT FALSE,
        partial_area DOUBLE PRECISION,
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
        is_active BOOLEAN DEFAULT TRUE,
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
        is_valid BOOLEAN DEFAULT TRUE,
        invalidated_at TEXT,
        invalidation_reason TEXT,
        created_at TEXT NOT NULL
      );

      -- TOC Signatures
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
        consideration_amount DOUBLE PRECISION,
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
        id SERIAL PRIMARY KEY,
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
        id SERIAL PRIMARY KEY,
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
        base_liability DOUBLE PRECISION NOT NULL,
        accumulated_arrears DOUBLE PRECISION DEFAULT 0,
        late_surcharges DOUBLE PRECISION DEFAULT 0,
        total_outstanding DOUBLE PRECISION NOT NULL,
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

      -- NOC Signatures
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
      CREATE INDEX IF NOT EXISTS idx_pg_jurisdictions_parent ON jurisdictions(parent_id);
      CREATE INDEX IF NOT EXISTS idx_pg_jurisdictions_path ON jurisdictions(path);
      CREATE INDEX IF NOT EXISTS idx_pg_officers_role ON officers(role_code);
      CREATE INDEX IF NOT EXISTS idx_pg_officers_jurisdiction ON officers(jurisdiction_id);
      CREATE INDEX IF NOT EXISTS idx_pg_parcels_jurisdiction ON parcels(jurisdiction_id);
      CREATE INDEX IF NOT EXISTS idx_pg_parcels_owner ON parcels(current_owner_id);
      CREATE INDEX IF NOT EXISTS idx_pg_transfers_seller ON transfers(seller_id);
      CREATE INDEX IF NOT EXISTS idx_pg_transfers_buyer ON transfers(buyer_id);
      CREATE INDEX IF NOT EXISTS idx_pg_transfers_parcel ON transfers(parcel_id);
      CREATE INDEX IF NOT EXISTS idx_pg_transfers_status ON transfers(status);
      CREATE INDEX IF NOT EXISTS idx_pg_audit_entity ON audit_log(entity_type, entity_id);
      CREATE INDEX IF NOT EXISTS idx_pg_audit_actor ON audit_log(actor_id);
      CREATE INDEX IF NOT EXISTS idx_pg_land_taxes_parcel ON land_taxes(parcel_id);
      CREATE INDEX IF NOT EXISTS idx_pg_land_disputes_parcel ON land_disputes(parcel_id);
    `);
    console.log('✅ Tables, foreign keys and indexes created');

    // 3. PL/pgSQL Immutability Triggers (§2 Invariants)
    await client.query(`
      -- Trigger 1: Protect parcel government source fields
      CREATE OR REPLACE FUNCTION trg_protect_parcel_source_fields()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.parcel_uid <> NEW.parcel_uid THEN
          RAISE EXCEPTION 'SOURCE_FIELD_PROTECTED: parcel_uid cannot be modified';
        END IF;
        IF OLD.survey_number <> NEW.survey_number THEN
          RAISE EXCEPTION 'SOURCE_FIELD_PROTECTED: survey_number cannot be modified';
        END IF;
        IF OLD.subdivision_number IS DISTINCT FROM NEW.subdivision_number THEN
          RAISE EXCEPTION 'SOURCE_FIELD_PROTECTED: subdivision_number cannot be modified';
        END IF;
        IF OLD.patta_number IS DISTINCT FROM NEW.patta_number THEN
          RAISE EXCEPTION 'SOURCE_FIELD_PROTECTED: patta_number cannot be modified';
        END IF;
        IF OLD.khatian_number IS DISTINCT FROM NEW.khatian_number THEN
          RAISE EXCEPTION 'SOURCE_FIELD_PROTECTED: khatian_number cannot be modified';
        END IF;
        IF OLD.area_declared_sqm <> NEW.area_declared_sqm THEN
          RAISE EXCEPTION 'SOURCE_FIELD_PROTECTED: area_declared_sqm cannot be modified';
        END IF;
        IF OLD.geometry IS DISTINCT FROM NEW.geometry THEN
          RAISE EXCEPTION 'SOURCE_FIELD_PROTECTED: geometry cannot be modified';
        END IF;
        IF OLD.source_record_hash IS DISTINCT FROM NEW.source_record_hash THEN
          RAISE EXCEPTION 'SOURCE_FIELD_PROTECTED: source_record_hash cannot be modified';
        END IF;
        IF OLD.jurisdiction_id <> NEW.jurisdiction_id THEN
          RAISE EXCEPTION 'SOURCE_FIELD_PROTECTED: jurisdiction_id cannot be modified';
        END IF;
        IF OLD.state <> NEW.state OR
           OLD.district <> NEW.district OR
           OLD.subdivision <> NEW.subdivision OR
           OLD.tehsil <> NEW.tehsil OR
           OLD.circle <> NEW.circle OR
           OLD.village <> NEW.village THEN
          RAISE EXCEPTION 'SOURCE_FIELD_PROTECTED: administrative location cannot be modified';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_parcels_protect_source ON parcels;
      CREATE TRIGGER trg_parcels_protect_source
      BEFORE UPDATE ON parcels
      FOR EACH ROW
      EXECUTE FUNCTION trg_protect_parcel_source_fields();

      -- Trigger 2: Append-only audit log
      CREATE OR REPLACE FUNCTION trg_prevent_audit_modification()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'UPDATE' THEN
          RAISE EXCEPTION 'AUDIT_LOG_IMMUTABLE: audit_log rows cannot be updated';
        ELSIF TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'AUDIT_LOG_IMMUTABLE: audit_log rows cannot be deleted';
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_audit_no_update_delete ON audit_log;
      CREATE TRIGGER trg_audit_no_update_delete
      BEFORE UPDATE OR DELETE ON audit_log
      FOR EACH ROW
      EXECUTE FUNCTION trg_prevent_audit_modification();

      -- Trigger 3: Append-only ownership history
      CREATE OR REPLACE FUNCTION trg_prevent_ownership_modification()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'UPDATE' THEN
          RAISE EXCEPTION 'OWNERSHIP_HISTORY_IMMUTABLE: ownership_history rows cannot be updated';
        ELSIF TG_OP = 'DELETE' THEN
          RAISE EXCEPTION 'OWNERSHIP_HISTORY_IMMUTABLE: ownership_history rows cannot be deleted';
        END IF;
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_ownership_no_update_delete ON ownership_history;
      CREATE TRIGGER trg_ownership_no_update_delete
      BEFORE UPDATE OR DELETE ON ownership_history
      FOR EACH ROW
      EXECUTE FUNCTION trg_prevent_ownership_modification();

      -- Trigger 4: Citizen UID immutability
      CREATE OR REPLACE FUNCTION trg_prevent_citizen_uid_change()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.citizen_uid <> NEW.citizen_uid THEN
          RAISE EXCEPTION 'IDENTIFIER_IMMUTABLE: citizen_uid cannot be changed';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_citizens_no_uid_change ON citizens;
      CREATE TRIGGER trg_citizens_no_uid_change
      BEFORE UPDATE ON citizens
      FOR EACH ROW
      EXECUTE FUNCTION trg_prevent_citizen_uid_change();

      -- Trigger 5: Officer UID immutability
      CREATE OR REPLACE FUNCTION trg_prevent_officer_uid_change()
      RETURNS TRIGGER AS $$
      BEGIN
        IF OLD.officer_uid <> NEW.officer_uid THEN
          RAISE EXCEPTION 'IDENTIFIER_IMMUTABLE: officer_uid cannot be changed';
        END IF;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql;

      DROP TRIGGER IF EXISTS trg_officers_no_uid_change ON officers;
      CREATE TRIGGER trg_officers_no_uid_change
      BEFORE UPDATE ON officers
      FOR EACH ROW
      EXECUTE FUNCTION trg_prevent_officer_uid_change();
    `);
    console.log('✅ PL/pgSQL immutability triggers installed');

    await client.query('COMMIT');
    console.log('🎉 PostgreSQL migration complete!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ PostgreSQL migration failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

// Execute directly if run via CLI
if (require.main === module || process.argv[1]?.includes('migrate-pg')) {
  runPgMigration()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
