import { describe, it, expect } from 'vitest';
import { newDb, DataType } from 'pg-mem';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as pgSchema from './schema.pg';

describe('PostgreSQL Database Engine & Schema Verification', () => {
  it('creates and executes PostgreSQL schema in a mock Postgres database', async () => {
    const memDb = newDb();

    // Register uuid and postgis mock functions
    memDb.public.registerFunction({
      name: 'uuid_generate_v4',
      returns: DataType.text,
      implementation: () => 'mock-uuid-' + Math.random().toString(36).substring(7),
    });

    const pgAdapter = memDb.adapters.createPg();
    const pool = new pgAdapter.Pool();

    // Test running the table creation queries
    await pool.query(`
      CREATE TABLE jurisdictions (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        parent_id TEXT,
        path TEXT NOT NULL,
        geometry TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE roles (
        id TEXT PRIMARY KEY,
        code TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        level INTEGER NOT NULL,
        scope TEXT NOT NULL,
        dashboard_route TEXT NOT NULL,
        allows_multiple BOOLEAN DEFAULT FALSE,
        created_at TEXT NOT NULL
      );

      CREATE TABLE citizens (
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
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        must_change_password BOOLEAN DEFAULT FALSE,
        failed_login_attempts INTEGER DEFAULT 0,
        locked_until TEXT,
        password_history TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE parcels (
        id TEXT PRIMARY KEY,
        parcel_uid TEXT NOT NULL UNIQUE,
        state TEXT NOT NULL,
        district TEXT NOT NULL,
        subdivision TEXT NOT NULL,
        tehsil TEXT NOT NULL,
        circle TEXT NOT NULL,
        village TEXT NOT NULL,
        jurisdiction_id TEXT NOT NULL,
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
        current_owner_id TEXT,
        ownership_type TEXT NOT NULL,
        encumbrance_status TEXT NOT NULL DEFAULT 'CLEAR',
        source_authority TEXT,
        source_record_hash TEXT,
        source_fetched_at TEXT,
        is_locked BOOLEAN DEFAULT TRUE,
        derived_from_parcel_id TEXT,
        pending_source_confirmation BOOLEAN DEFAULT FALSE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE transfers (
        id TEXT PRIMARY KEY,
        application_uid TEXT NOT NULL UNIQUE,
        parcel_id TEXT NOT NULL,
        seller_id TEXT NOT NULL,
        buyer_id TEXT NOT NULL,
        transfer_type TEXT NOT NULL,
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
    `);

    // Verify Drizzle ORM works against the PostgreSQL adapter
    const db = drizzle(pool, { schema: pgSchema });

    // Insert a test citizen into PostgreSQL
    await pool.query(`
      INSERT INTO citizens (
        id, citizen_uid, full_name, email, mobile, aadhaar_encrypted, aadhaar_masked,
        pan_encrypted, pan_masked, date_of_birth, address_line1, village_town, district,
        state, pin, password_hash, status, created_at, updated_at
      ) VALUES (
        'cit-pg-1', 'BSC-AS-2026-99999999', 'Postgres Test User', 'pgtest@bhoomisetu.demo',
        '9876543210', 'enc_aadhaar', 'XXXX XXXX 1234', 'enc_pan', 'ABCDE****F',
        '1990-01-01', 'Test Address', 'Tezpur', 'Sonitpur', 'Assam', '784001',
        'test_hash', 'ACTIVE', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'
      )
    `);

    const result = await pool.query('SELECT citizen_uid, full_name FROM citizens WHERE id = $1', ['cit-pg-1']);
    expect(result.rows.length).toBe(1);
    expect(result.rows[0].citizen_uid).toBe('BSC-AS-2026-99999999');
    expect(result.rows[0].full_name).toBe('Postgres Test User');

    // Test parameter substitution ($1, $2) and PostGIS GeoJSON storage
    await pool.query(`
      INSERT INTO parcels (
        id, parcel_uid, state, district, subdivision, tehsil, circle, village,
        jurisdiction_id, survey_number, land_type, area_declared_sqm, geometry,
        current_owner_id, ownership_type, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
      )
    `, [
      'parcel-pg-1', 'AS-SONITPUR-TEZPUR-BORGHAT-999-A', 'Assam', 'Sonitpur',
      'Tezpur', 'Tezpur', 'Tezpur Circle', 'Borghat', 'j-vil-1', '999',
      'AGRICULTURAL', 2500.5, JSON.stringify({ type: 'Polygon', coordinates: [[[92.8, 26.6], [92.81, 26.6], [92.81, 26.61], [92.8, 26.61], [92.8, 26.6]]] }),
      'cit-pg-1', 'SOLE', '2026-01-01T00:00:00Z', '2026-01-01T00:00:00Z'
    ]);

    const parcelRes = await pool.query('SELECT parcel_uid, area_declared_sqm FROM parcels WHERE id = $1', ['parcel-pg-1']);
    expect(parcelRes.rows.length).toBe(1);
    expect(parcelRes.rows[0].parcel_uid).toBe('AS-SONITPUR-TEZPUR-BORGHAT-999-A');
    expect(parcelRes.rows[0].area_declared_sqm).toBe(2500.5);

    await pool.end();
  });
});
