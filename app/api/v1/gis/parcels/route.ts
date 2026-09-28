import { NextRequest } from 'next/server';
import { getAuthUser, successResponse, errorResponse } from '@/lib/api/helpers';
import Database from 'better-sqlite3';
import path from 'path';
import crypto from 'crypto';
import * as turf from '@turf/turf';

function getDb() {
  const DB_PATH = process.env.DATABASE_URL || path.join(process.cwd(), 'data', 'bhoomisetu.db');
  const db = new Database(DB_PATH);
  db.pragma('foreign_keys = ON');
  return db;
}

function maskName(name: string): string {
  if (!name) return 'Protected Owner';
  const parts = name.split(' ');
  return parts.map(p => p.length > 2 ? p[0] + '*'.repeat(p.length - 2) + p[p.length - 1] : p[0] + '*').join(' ');
}

// GET /api/v1/gis/parcels — Returns all parcels formatted for Leaflet & GeoJSON layers
export async function GET(req: NextRequest) {
  const user = await getAuthUser(req);
  const { searchParams } = new URL(req.url);
  const village = searchParams.get('village');
  const landType = searchParams.get('land_type');
  const encumbrance = searchParams.get('encumbrance');
  const taxStatus = searchParams.get('tax_status');
  const search = searchParams.get('search');

  const db = getDb();
  try {
    let query = `
      SELECT 
        p.id, p.parcel_uid, p.state, p.district, p.subdivision, p.tehsil, p.circle, p.village,
        p.jurisdiction_id, p.survey_number, p.subdivision_number, p.patta_number, p.khatian_number,
        p.land_type, p.land_class, p.area_declared_sqm, p.area_computed_sqm,
        p.geometry, p.boundary_north, p.boundary_south, p.boundary_east, p.boundary_west,
        p.current_owner_id, p.ownership_type, p.encumbrance_status, p.created_at, p.updated_at,
        c.full_name as raw_owner_name, c.citizen_uid as owner_uid, c.mobile as raw_owner_mobile, c.email as raw_owner_email,
        t.total_outstanding as tax_outstanding, t.status as tax_status, t.base_liability as tax_base,
        (SELECT COUNT(*) FROM land_disputes d WHERE d.parcel_id = p.id AND d.status IN ('OPEN', 'UNDER_INVESTIGATION')) as active_disputes_count
      FROM parcels p
      LEFT JOIN citizens c ON p.current_owner_id = c.id
      LEFT JOIN land_taxes t ON t.parcel_id = p.id AND t.financial_year = '2025-2026'
      WHERE 1=1
    `;
    const params: any[] = [];

    if (village && village !== 'ALL') {
      query += ` AND p.village = ?`;
      params.push(village);
    }
    if (landType && landType !== 'ALL') {
      query += ` AND p.land_type = ?`;
      params.push(landType);
    }
    if (encumbrance && encumbrance !== 'ALL') {
      query += ` AND p.encumbrance_status = ?`;
      params.push(encumbrance);
    }
    if (taxStatus && taxStatus !== 'ALL') {
      query += ` AND t.status = ?`;
      params.push(taxStatus);
    }
    if (search && search.trim().length > 0) {
      query += ` AND (p.survey_number LIKE ? OR p.parcel_uid LIKE ? OR p.patta_number LIKE ? OR c.full_name LIKE ?)`;
      const term = `%${search.trim()}%`;
      params.push(term, term, term, term);
    }

    query += ` ORDER BY p.village, p.survey_number`;

    const rows = db.prepare(query).all(...params) as any[];

    // Map privacy-aware fields
    const isAuthenticated = !!user;
    const isOfficer = user && user.role !== 'CITIZEN';

    const features = rows.map((row) => {
      let geojson = null;
      try {
        geojson = typeof row.geometry === 'string' ? JSON.parse(row.geometry) : row.geometry;
      } catch (e) {
        geojson = null;
      }

      // Check if user is owner of this parcel
      const isOwner = user && (row.current_owner_id === user.id || row.owner_uid === user.uid);
      const canViewPII = isOfficer || isOwner;

      return {
        type: 'Feature',
        id: row.id,
        geometry: geojson,
        properties: {
          id: row.id,
          parcel_uid: row.parcel_uid,
          survey_number: row.survey_number,
          subdivision_number: row.subdivision_number,
          patta_number: row.patta_number,
          khatian_number: row.khatian_number,
          state: row.state,
          district: row.district,
          subdivision: row.subdivision,
          tehsil: row.tehsil,
          circle: row.circle,
          village: row.village,
          jurisdiction_id: row.jurisdiction_id,
          land_type: row.land_type,
          land_class: row.land_class,
          area_declared_sqm: row.area_declared_sqm,
          area_computed_sqm: row.area_computed_sqm,
          ownership_type: row.ownership_type,
          encumbrance_status: row.encumbrance_status,
          created_at: row.created_at,
          boundary_north: row.boundary_north,
          boundary_south: row.boundary_south,
          boundary_east: row.boundary_east,
          boundary_west: row.boundary_west,
          // Privacy protection (inspired by GeoPortal access levels)
          owner_name: canViewPII ? row.raw_owner_name : maskName(row.raw_owner_name),
          owner_uid: canViewPII ? row.owner_uid : undefined,
          owner_mobile: canViewPII ? row.raw_owner_mobile : undefined,
          is_owner: isOwner,
          can_view_pii: canViewPII,
          // Tax / Khajana data
          tax_status: row.tax_status || 'PAID',
          tax_outstanding: row.tax_outstanding || 0,
          tax_base: row.tax_base || 0,
          // Disputes
          active_disputes_count: row.active_disputes_count || 0,
        },
      };
    });

    return successResponse({
      type: 'FeatureCollection',
      features,
      count: features.length,
      isAuthenticated,
      userRole: user?.role || 'GUEST',
    });
  } catch (error: any) {
    console.error('Error fetching GIS parcels:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to retrieve GIS parcels: ' + error.message, 500);
  } finally {
    db.close();
  }
}

// POST /api/v1/gis/parcels — Record / Save new surveyed cadastral parcel
export async function POST(req: NextRequest) {
  const user = await getAuthUser(req);
  const db = getDb();

  try {
    const body = await req.json();
    const {
      village,
      survey_number,
      subdivision_number = 'A',
      patta_number,
      khatian_number,
      land_type = 'AGRICULTURAL',
      ownership_type = 'SOLE',
      owner_id,
      geometry, // GeoJSON polygon
      boundary_north,
      boundary_south,
      boundary_east,
      boundary_west,
      declared_area,
    } = body;

    if (!village || !survey_number || !geometry) {
      return errorResponse('VALIDATION_ERROR', 'Village, survey number, and polygon geometry are required.', 400);
    }

    // Validate geometry using turf
    let parsedGeom: any = geometry;
    if (typeof geometry === 'string') {
      try {
        parsedGeom = JSON.parse(geometry);
      } catch (e) {
        return errorResponse('VALIDATION_ERROR', 'Invalid GeoJSON string format.', 400);
      }
    }

    if (!parsedGeom || parsedGeom.type !== 'Polygon' || !Array.isArray(parsedGeom.coordinates)) {
      return errorResponse('VALIDATION_ERROR', 'Geometry must be a valid GeoJSON Polygon with coordinates.', 400);
    }

    // Compute precise area in square meters using Turf.js
    let computedAreaSqm = 0;
    try {
      computedAreaSqm = turf.area(parsedGeom);
    } catch (e) {
      console.warn('Turf area calculation failed, falling back to approximate:', e);
      computedAreaSqm = declared_area || 500;
    }

    const finalDeclaredArea = declared_area ? Number(declared_area) : Math.round(computedAreaSqm);

    // Look up jurisdiction by village name
    const jurisdiction = db.prepare(`
      SELECT id, path FROM jurisdictions 
      WHERE type = 'VILLAGE' AND UPPER(name) = UPPER(?) 
      LIMIT 1
    `).get(village) as any;

    const jurisdictionId = jurisdiction?.id || 'j-vil-1';

    // Generate standardized parcel UID
    const cleanVillage = village.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const cleanSurvey = String(survey_number).replace(/[^A-Z0-9]/g, '');
    const cleanSub = String(subdivision_number || 'A').toUpperCase();
    const parcelUid = `AS-SONITPUR-TEZPUR-${cleanVillage}-${cleanSurvey}-${cleanSub}`;

    // Check if parcel already exists
    const existing = db.prepare('SELECT id FROM parcels WHERE parcel_uid = ?').get(parcelUid);
    if (existing) {
      return errorResponse('CONFLICT', `Parcel UID ${parcelUid} already exists in the system.`, 409);
    }

    // Generate unique ID and deterministic hash for source verification
    const id = `parcel-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const sourceRecordHash = crypto
      .createHash('sha256')
      .update(`${parcelUid}:${cleanSurvey}:${finalDeclaredArea}:${JSON.stringify(parsedGeom)}:${now}`)
      .digest('hex');

    // Default owner to provided owner_id or user's id or the first citizen
    let finalOwnerId = owner_id;
    if (!finalOwnerId) {
      if (user && user.role === 'CITIZEN') {
        const citizen = db.prepare('SELECT id FROM citizens WHERE citizen_uid = ?').get(user.uid) as any;
        finalOwnerId = citizen?.id;
      }
      if (!finalOwnerId) {
        const firstCitizen = db.prepare('SELECT id FROM citizens LIMIT 1').get() as any;
        finalOwnerId = firstCitizen?.id || null;
      }
    }

    // Insert new parcel into database
    const insertParcel = db.prepare(`
      INSERT INTO parcels (
        id, parcel_uid, state, district, subdivision, tehsil, circle, village,
        jurisdiction_id, survey_number, subdivision_number, patta_number, khatian_number,
        land_type, land_class, area_declared_sqm, area_computed_sqm, geometry,
        boundary_north, boundary_south, boundary_east, boundary_west,
        current_owner_id, ownership_type, encumbrance_status,
        source_authority, source_record_hash, source_fetched_at,
        is_locked, created_at, updated_at
      ) VALUES (
        ?, ?, 'Assam', 'Sonitpur', 'Tezpur', 'Tezpur', 'Tezpur Circle', ?,
        ?, ?, ?, ?, ?,
        ?, 'Cadastral GIS Survey', ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, 'CLEAR',
        'Bhoomisetu GIS Survey Engine', ?, ?,
        1, ?, ?
      )
    `);

    insertParcel.run(
      id,
      parcelUid,
      village,
      jurisdictionId,
      String(survey_number),
      cleanSub,
      patta_number || `PATTA-${cleanSurvey}001`,
      khatian_number || `KHAT-${cleanSurvey}002`,
      land_type,
      finalDeclaredArea,
      computedAreaSqm,
      JSON.stringify(parsedGeom),
      boundary_north || 'Surveyed Northern Boundary',
      boundary_south || 'Surveyed Southern Boundary',
      boundary_east || 'Surveyed Eastern Boundary',
      boundary_west || 'Surveyed Western Access Road',
      finalOwnerId,
      ownership_type,
      sourceRecordHash,
      now,
      now,
      now
    );

    // Create initial Khajana tax assessment
    if (finalOwnerId) {
      const taxRatePerSqm = land_type === 'COMMERCIAL' ? 1.5 : land_type === 'RESIDENTIAL' ? 0.8 : 0.2;
      const baseLiability = Math.round(finalDeclaredArea * taxRatePerSqm);
      db.prepare(`
        INSERT INTO land_taxes (
          id, parcel_id, citizen_id, financial_year, base_liability,
          accumulated_arrears, late_surcharges, total_outstanding,
          status, due_date, created_at, updated_at
        ) VALUES (?, ?, ?, '2025-2026', ?, 0, 0, ?, 'PENDING', '2026-03-31', ?, ?)
      `).run(
        `tax-${id}`,
        id,
        finalOwnerId,
        baseLiability,
        baseLiability,
        now,
        now
      );
    }

    // Append to audit log
    db.prepare(`
      INSERT INTO audit_log (
        actor_id, actor_type, actor_role_code, actor_jurisdiction_id,
        action, entity_type, entity_id, previous_status, new_status,
        reason, metadata, ip_address, created_at
      ) VALUES (?, ?, ?, ?, 'RECORD_SURVEYED_PARCEL', 'PARCEL', ?, NULL, 'REGISTERED', ?, ?, '127.0.0.1', ?)
    `).run(
      user?.uid || 'GIS_WORKER',
      user ? (user.role === 'CITIZEN' ? 'CITIZEN' : 'OFFICER') : 'SYSTEM',
      user?.role || 'SYSTEM',
      jurisdictionId,
      id,
      `Surveyed and mapped cadastral parcel ${parcelUid} on GIS GeoPortal with area ${finalDeclaredArea} sq m.`,
      JSON.stringify({ computedAreaSqm, survey_number, village }),
      now
    );

    return successResponse({
      message: 'Surveyed parcel successfully recorded and saved to Bhoomisetu database.',
      parcel: {
        id,
        parcel_uid: parcelUid,
        village,
        survey_number,
        area_declared_sqm: finalDeclaredArea,
        area_computed_sqm: computedAreaSqm,
        land_type,
        ownership_type,
      },
    }, 201);
  } catch (error: any) {
    console.error('Error saving surveyed parcel:', error);
    return errorResponse('INTERNAL_ERROR', 'Failed to save parcel: ' + error.message, 500);
  } finally {
    db.close();
  }
}
