// Bhoomisetu — PostgreSQL Seed Script (§16)
// Seeds Assam jurisdiction tree, officers, citizens, parcels, transfer applications, and tax ledgers
// Deterministic — same output every run

import { Pool } from 'pg';
import crypto from 'crypto';
import { runPgMigration } from './migrate-pg';
import { encrypt as realEncrypt, maskAadhaar, maskPAN } from '../auth/encryption';

const PG_URL = process.env.DATABASE_URL || 'postgresql://postgres:password@localhost:5432/bhoomisetu';

const DEV_PASSWORD = 'Demo@12345';
const DEV_PASSWORD_HASH = '$argon2id$v=19$m=65536,t=3,p=4$wzfXIGhURuqahPA4sOaGUA$JHkY0Tnui/qZUZLdaEAM68IZ1bn0+p2mCMRzArYijOA';

function encrypt(value: string): string {
  return realEncrypt(value);
}

export async function runPgSeed() {
  // Ensure tables and triggers are created first
  await runPgMigration();

  console.log('\n🌱 Seeding Bhoomisetu PostgreSQL database...');
  const pool = new Pool({
    connectionString: PG_URL,
    ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  });

  const client = await pool.connect();
  const now = new Date().toISOString();

  try {
    await client.query('BEGIN');

    // 1. Jurisdictions
    console.log('🗺️  Seeding jurisdictions...');
    const jurisdictionData = [
      { id: 'j-div-1', code: 'AS', name: 'Upper Assam', type: 'DIVISION', parentId: null, path: 'AS' },
      { id: 'j-dist-1', code: 'AS.SONITPUR', name: 'Sonitpur', type: 'DISTRICT', parentId: 'j-div-1', path: 'AS.SONITPUR' },
      { id: 'j-sdiv-1', code: 'AS.SONITPUR.TEZPUR', name: 'Tezpur', type: 'SUBDIVISION', parentId: 'j-dist-1', path: 'AS.SONITPUR.TEZPUR' },
      { id: 'j-teh-1', code: 'AS.SONITPUR.TEZPUR.TEZPUR', name: 'Tezpur', type: 'TEHSIL', parentId: 'j-sdiv-1', path: 'AS.SONITPUR.TEZPUR.TEZPUR' },
      { id: 'j-cir-1', code: 'AS.SONITPUR.TEZPUR.TEZPUR.TEZPUR_CIRCLE', name: 'Tezpur Circle', type: 'CIRCLE', parentId: 'j-teh-1', path: 'AS.SONITPUR.TEZPUR.TEZPUR.TEZPUR_CIRCLE' },
      { id: 'j-cir-2', code: 'AS.SONITPUR.TEZPUR.TEZPUR.DHEKIAJULI_CIRCLE', name: 'Dhekiajuli Circle', type: 'CIRCLE', parentId: 'j-teh-1', path: 'AS.SONITPUR.TEZPUR.TEZPUR.DHEKIAJULI_CIRCLE' },
      { id: 'j-vil-1', code: 'AS.SONITPUR.TEZPUR.TEZPUR.TEZPUR_CIRCLE.BORGHAT', name: 'Borghat', type: 'VILLAGE', parentId: 'j-cir-1', path: 'AS.SONITPUR.TEZPUR.TEZPUR.TEZPUR_CIRCLE.BORGHAT' },
      { id: 'j-vil-2', code: 'AS.SONITPUR.TEZPUR.TEZPUR.TEZPUR_CIRCLE.NIKASHI', name: 'Nikashi', type: 'VILLAGE', parentId: 'j-cir-1', path: 'AS.SONITPUR.TEZPUR.TEZPUR.TEZPUR_CIRCLE.NIKASHI' },
      { id: 'j-vil-3', code: 'AS.SONITPUR.TEZPUR.TEZPUR.DHEKIAJULI_CIRCLE.BHOMORAGURI', name: 'Bhomoraguri', type: 'VILLAGE', parentId: 'j-cir-2', path: 'AS.SONITPUR.TEZPUR.TEZPUR.DHEKIAJULI_CIRCLE.BHOMORAGURI' },
    ];

    for (const j of jurisdictionData) {
      await client.query(`
        INSERT INTO jurisdictions (id, code, name, type, parent_id, path, geometry, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, NULL, $7, $8)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          path = EXCLUDED.path,
          updated_at = EXCLUDED.updated_at
      `, [j.id, j.code, j.name, j.type, j.parentId, j.path, now, now]);
    }

    // 2. Roles
    console.log('👤 Seeding roles...');
    const roleData = [
      { code: 'DIV_COMM', name: 'Division Commissioner', level: 1, scope: 'DIVISION', route: '/dashboard/division' },
      { code: 'DIST_COLL', name: 'District Collector', level: 2, scope: 'DISTRICT', route: '/dashboard/district' },
      { code: 'SDO', name: 'Sub-Collector / SDO', level: 3, scope: 'SUBDIVISION', route: '/dashboard/sdo' },
      { code: 'TEHSILDAR', name: 'Tehsildar', level: 4, scope: 'TEHSIL', route: '/dashboard/tehsildar' },
      { code: 'CIRCLE_OFF', name: 'Circle / Revenue Officer', level: 5, scope: 'CIRCLE', route: '/dashboard/circle' },
      { code: 'VILLAGE_OFF', name: 'Village / Gram Panchayat Officer', level: 6, scope: 'VILLAGE', route: '/dashboard/village' },
      { code: 'CITIZEN', name: 'Citizen / Landowner', level: 7, scope: 'SELF', route: '/dashboard/citizen' },
    ];

    for (const r of roleData) {
      await client.query(`
        INSERT INTO roles (id, code, name, level, scope, dashboard_route, created_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          level = EXCLUDED.level,
          scope = EXCLUDED.scope,
          dashboard_route = EXCLUDED.dashboard_route
      `, [`role-${r.code}`, r.code, r.name, r.level, r.scope, r.route, now]);
    }

    // 3. Officers
    console.log('🏛️  Seeding officers...');
    const officerData = [
      { id: 'off-1', uid: 'BSO-DVC-AS-000001', name: 'Dr. Rajesh Kumar Sharma', email: 'divcomm@bhoomisetu.gov.in', mobile: '9876543001', role: 'DIV_COMM', jurisdictionId: 'j-div-1' },
      { id: 'off-2', uid: 'BSO-DCL-AS0901-000001', name: 'Priya Borthakur', email: 'dc.sonitpur@bhoomisetu.gov.in', mobile: '9876543002', role: 'DIST_COLL', jurisdictionId: 'j-dist-1' },
      { id: 'off-3', uid: 'BSO-SDO-AS0905-000001', name: 'Anupam Hazarika', email: 'sdo.tezpur@bhoomisetu.gov.in', mobile: '9876543003', role: 'SDO', jurisdictionId: 'j-sdiv-1' },
      { id: 'off-4', uid: 'BSO-TEH-AS0905-000001', name: 'Mrinmoy Deka', email: 'teh.tezpur@bhoomisetu.gov.in', mobile: '9876543004', role: 'TEHSILDAR', jurisdictionId: 'j-teh-1' },
      { id: 'off-5', uid: 'BSO-CRO-AS090501-000001', name: 'Kabita Barman', email: 'co.tezpur@bhoomisetu.gov.in', mobile: '9876543005', role: 'CIRCLE_OFF', jurisdictionId: 'j-cir-1' },
      { id: 'off-6', uid: 'BSO-CRO-AS090502-000001', name: 'Deepak Kalita', email: 'co.dhekiajuli@bhoomisetu.gov.in', mobile: '9876543006', role: 'CIRCLE_OFF', jurisdictionId: 'j-cir-2' },
      { id: 'off-7', uid: 'BSO-VLO-AS09050101-000001', name: 'Ranjit Bora', email: 'vo.borghat@bhoomisetu.gov.in', mobile: '9876543007', role: 'VILLAGE_OFF', jurisdictionId: 'j-vil-1' },
      { id: 'off-8', uid: 'BSO-VLO-AS09050102-000001', name: 'Junali Das', email: 'vo.nikashi@bhoomisetu.gov.in', mobile: '9876543008', role: 'VILLAGE_OFF', jurisdictionId: 'j-vil-2' },
      { id: 'off-9', uid: 'BSO-VLO-AS09050201-000001', name: 'Bijoy Gogoi', email: 'vo.bhomoraguri@bhoomisetu.gov.in', mobile: '9876543009', role: 'VILLAGE_OFF', jurisdictionId: 'j-vil-3' },
    ];

    for (const o of officerData) {
      await client.query(`
        INSERT INTO officers (id, officer_uid, full_name, email, mobile, role_code, jurisdiction_id,
          password_hash, status, must_change_password, effective_from, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'ACTIVE', FALSE, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          mobile = EXCLUDED.mobile,
          role_code = EXCLUDED.role_code,
          jurisdiction_id = EXCLUDED.jurisdiction_id,
          updated_at = EXCLUDED.updated_at
      `, [o.id, o.uid, o.name, o.email, o.mobile, o.role, o.jurisdictionId, DEV_PASSWORD_HASH, now, now, now]);
    }

    // 4. Citizens (30)
    console.log('👥 Seeding 30 citizens...');
    const citizenNames = [
      'Anjan Borah', 'Bina Kalita', 'Chiranjib Das', 'Dipika Hazarika', 'Eshan Goswami',
      'Farida Begum', 'Gautam Nath', 'Himadri Sharma', 'Indrani Phukan', 'Jagadish Saikia',
      'Kaveri Bhuyan', 'Lakshmi Devi', 'Manoj Chetia', 'Nandita Baruah', 'Om Prakash Agarwal',
      'Pallabi Mahanta', 'Quamrul Islam', 'Rupjyoti Bora', 'Sunita Tamuli', 'Tapan Medhi',
      'Uma Sharma', 'Vikram Singh', 'Wahida Ahmed', 'Xorai Pegu', 'Yogesh Rajbongshi',
      'Zubeen Dutta', 'Arjun Neog', 'Bharati Konwar', 'Chandan Sut', 'Dhruba Rajkhowa',
    ];

    for (let i = 0; i < 30; i++) {
      const idx = i + 1;
      const id = `cit-${String(idx).padStart(4, '0')}`;
      const uid = `BSC-AS-2026-${String(idx).padStart(8, '0')}`;
      const name = citizenNames[i];
      const email = `citizen${idx}@bhoomisetu.demo`;
      const mobile = `9${String(800000000 + idx).padStart(9, '0')}`;
      const aadhaar = `${String(200000000000 + idx * 111111)}`.slice(0, 12);
      const pan = `ABCPD${String(1000 + idx).slice(0, 4)}${String.fromCharCode(65 + (idx % 26))}`;

      await client.query(`
        INSERT INTO citizens (id, citizen_uid, full_name, email, mobile, aadhaar_encrypted, aadhaar_masked,
          pan_encrypted, pan_masked, date_of_birth, address_line1, village_town, district, state, pin,
          password_hash, status, must_change_password, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, 'ACTIVE', FALSE, $17, $18)
        ON CONFLICT (id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          mobile = EXCLUDED.mobile,
          updated_at = EXCLUDED.updated_at
      `, [
        id, uid, name, email, mobile,
        encrypt(aadhaar), maskAadhaar(aadhaar),
        encrypt(pan), maskPAN(pan),
        `${1970 + (idx % 30)}-${String(1 + (idx % 12)).padStart(2, '0')}-${String(1 + (idx % 28)).padStart(2, '0')}`,
        `House No. ${idx}, Ward ${1 + (idx % 10)}`,
        idx <= 10 ? 'Borghat' : idx <= 20 ? 'Nikashi' : 'Bhomoraguri',
        'Sonitpur', 'Assam', `784${String(idx % 100).padStart(3, '0')}`,
        DEV_PASSWORD_HASH,
        now, now
      ]);
    }

    // 5. Parcels (45)
    console.log('🏗️  Seeding 45 parcels...');
    const baseCoords = { lat: 26.63, lng: 92.80 };
    function makePolygon(lat: number, lng: number, sizeM: number): string {
      const dLat = sizeM / 111000;
      const dLng = sizeM / (111000 * Math.cos(lat * Math.PI / 180));
      const coords = [
        [lng - dLng/2, lat - dLat/2],
        [lng + dLng/2, lat - dLat/2],
        [lng + dLng/2, lat + dLat/2],
        [lng - dLng/2, lat + dLat/2],
        [lng - dLng/2, lat - dLat/2],
      ];
      return JSON.stringify({ type: 'Polygon', coordinates: [coords] });
    }

    const landTypes = ['AGRICULTURAL', 'RESIDENTIAL', 'COMMERCIAL', 'AGRICULTURAL', 'RESIDENTIAL',
      'AGRICULTURAL', 'INDUSTRIAL', 'AGRICULTURAL', 'RESIDENTIAL', 'AGRICULTURAL'];
    const villages = [
      { name: 'Borghat', code: 'BORGHAT', circle: 'Tezpur Circle', tehsil: 'Tezpur', jId: 'j-vil-1' },
      { name: 'Nikashi', code: 'NIKASHI', circle: 'Tezpur Circle', tehsil: 'Tezpur', jId: 'j-vil-2' },
      { name: 'Bhomoraguri', code: 'BHOMORAGURI', circle: 'Dhekiajuli Circle', tehsil: 'Tezpur', jId: 'j-vil-3' },
    ];

    for (let i = 0; i < 45; i++) {
      const idx = i + 1;
      const villageIdx = i % 3;
      const village = villages[villageIdx];
      const ownerId = `cit-${String(1 + (i % 30)).padStart(4, '0')}`;
      const surveyNum = String(100 + idx);
      const subDivNum = `${String.fromCharCode(65 + (i % 5))}`;
      const parcelUid = `AS-SONITPUR-TEZPUR-${village.code}-${surveyNum}-${subDivNum}`;

      const lat = baseCoords.lat + (i * 0.002 - 0.04) + (villageIdx * 0.01);
      const lng = baseCoords.lng + (i * 0.003 - 0.06) + (villageIdx * 0.02);
      const areaSqm = 500 + (i * 200) + (villageIdx * 1000);
      const geometry = makePolygon(lat, lng, Math.sqrt(areaSqm));

      const computedArea = i === 12 ? areaSqm * 1.07 : areaSqm * (0.99 + (i % 5) * 0.004);
      const encumbrance = i === 5 ? 'DISPUTED' : 'CLEAR';
      const ownershipType = (i === 3 || i === 8) ? 'JOINT' : 'SOLE';
      const landType = landTypes[i % landTypes.length];
      const sourceHash = crypto.createHash('sha256').update(parcelUid + surveyNum).digest('hex');

      await client.query(`
        INSERT INTO parcels (id, parcel_uid, state, district, subdivision, tehsil, circle, village,
          jurisdiction_id, survey_number, subdivision_number, patta_number, khatian_number, land_type, land_class,
          area_declared_sqm, area_computed_sqm, geometry, boundary_north, boundary_south, boundary_east, boundary_west,
          current_owner_id, ownership_type, encumbrance_status, source_authority, source_record_hash,
          source_fetched_at, is_locked, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25, $26, $27, $28, TRUE, $29, $30)
        ON CONFLICT (id) DO UPDATE SET
          current_owner_id = EXCLUDED.current_owner_id,
          ownership_type = EXCLUDED.ownership_type,
          encumbrance_status = EXCLUDED.encumbrance_status,
          updated_at = EXCLUDED.updated_at
      `, [
        `parcel-${String(idx).padStart(4, '0')}`,
        parcelUid,
        'Assam', 'Sonitpur', 'Tezpur', village.tehsil, village.circle, village.name,
        village.jId,
        surveyNum, subDivNum,
        `PATTA-${String(1000 + idx)}`,
        `KHAT-${String(2000 + idx)}`,
        landType, null,
        areaSqm, computedArea, geometry,
        `Survey No. ${Number(surveyNum) - 1} land`, `Survey No. ${Number(surveyNum) + 1} land`,
        `Survey No. ${surveyNum}A land`, `Village Road`,
        ownerId, ownershipType, encumbrance,
        'Assam Revenue Department',
        sourceHash,
        now,
        now, now
      ]);

      await client.query(`
        INSERT INTO ownership_history (id, parcel_id, from_owner_id, to_owner_id, transfer_type,
          transfer_date, registration_reference, created_at)
        VALUES ($1, $2, NULL, $3, 'INHERITANCE', '2020-01-15', $4, $5)
        ON CONFLICT (id) DO NOTHING
      `, [
        `oh-${String(idx).padStart(4, '0')}`,
        `parcel-${String(idx).padStart(4, '0')}`,
        ownerId,
        `REG/2020/${String(100 + idx)}`,
        now
      ]);
    }

    // 6. Transfer Applications (5)
    console.log('📋 Seeding 5 transfer applications...');
    const transferData = [
      { id: 'txn-0001', uid: 'LTA-2026-00000001', parcelId: 'parcel-0001', sellerId: 'cit-0001', buyerId: 'cit-0002', type: 'SALE', amount: 1500000, status: 'SUBMITTED_AWAITING_COUNTERPARTY' },
      { id: 'txn-0002', uid: 'LTA-2026-00000002', parcelId: 'parcel-0007', sellerId: 'cit-0007', buyerId: 'cit-0010', type: 'SALE', amount: 2500000, status: 'AT_CIRCLE_OFFICER_HANDSHAKE' },
      { id: 'txn-0003', uid: 'LTA-2026-00000003', parcelId: 'parcel-0010', sellerId: 'cit-0010', buyerId: 'cit-0015', type: 'SALE', amount: 3200000, status: 'AT_TEHSILDAR_VERIFICATION' },
      { id: 'txn-0004', uid: 'LTA-2026-00000004', parcelId: 'parcel-0015', sellerId: 'cit-0015', buyerId: 'cit-0020', type: 'GIFT', amount: 0, status: 'ON_HOLD' },
      { id: 'txn-0005', uid: 'LTA-2026-00000005', parcelId: 'parcel-0020', sellerId: 'cit-0020', buyerId: 'cit-0025', type: 'SALE', amount: 4500000, status: 'TRANSFER_COMPLETED' },
    ];

    for (const t of transferData) {
      await client.query(`
        INSERT INTO transfers (id, application_uid, parcel_id, seller_id, buyer_id,
          transfer_type, consideration_amount, status, created_at, updated_at,
          is_partial_transfer, handshake_attempts, handshake_resends_used)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, FALSE, 0, 0)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          updated_at = EXCLUDED.updated_at
      `, [t.id, t.uid, t.parcelId, t.sellerId, t.buyerId, t.type, t.amount, t.status, now, now]);
    }

    // 7. Permissions & Role Permissions
    console.log('🔐 Seeding permissions...');
    const permissionDefs = [
      { code: 'application.view', family: 'WORKFLOW', desc: 'View applications in jurisdiction' },
      { code: 'application.view.own', family: 'WORKFLOW', desc: 'View own applications' },
      { code: 'application.create', family: 'WORKFLOW', desc: 'Create transfer application' },
      { code: 'application.cancel.own', family: 'WORKFLOW', desc: 'Cancel own application' },
      { code: 'application.verify.basic', family: 'WORKFLOW', desc: 'Basic verification' },
      { code: 'application.verify.detailed', family: 'WORKFLOW', desc: 'Detailed + fee verification' },
      { code: 'application.forward', family: 'WORKFLOW', desc: 'Forward to next level' },
      { code: 'application.hold', family: 'WORKFLOW', desc: 'Put application on hold' },
      { code: 'application.return', family: 'WORKFLOW', desc: 'Return for correction' },
      { code: 'application.reject', family: 'WORKFLOW', desc: 'Reject application' },
      { code: 'application.approve.final', family: 'WORKFLOW', desc: 'Final approval (SDO)' },
      { code: 'application.monitor.subordinate', family: 'WORKFLOW', desc: 'Monitor subordinate cases' },
      { code: 'application.reassign', family: 'WORKFLOW', desc: 'Reassign stalled case' },
      { code: 'handshake.verify', family: 'WORKFLOW', desc: 'Verify hex handshake codes' },
      { code: 'signature.request', family: 'WORKFLOW', desc: 'Request digital signature' },
      { code: 'signature.countersign', family: 'WORKFLOW', desc: 'Countersign declaration' },
      { code: 'officer.appoint', family: 'WORKFLOW', desc: 'Appoint subordinate officer' },
      { code: 'parcel.lookup.public', family: 'WORKFLOW', desc: 'Lookup counterparty parcel' },
      { code: 'parcel.view.jurisdiction', family: 'WORKFLOW', desc: 'View parcels in jurisdiction' },
      { code: 'village.record.assist', family: 'WORKFLOW', desc: 'Village-level record assist' },
      { code: 'village.record.monitor', family: 'WORKFLOW', desc: 'Monitor village records (read)' },
      { code: 'source.parcel.read', family: 'SOURCE_DATA', desc: 'Read source parcel data' },
      { code: 'source.parcel.write', family: 'SOURCE_DATA', desc: 'Write source parcel data — NEVER ASSIGNED' },
      { code: 'source.owner.write', family: 'SOURCE_DATA', desc: 'Write source owner data — NEVER ASSIGNED' },
      { code: 'correction.request', family: 'SOURCE_DATA', desc: 'Raise correction request' },
      { code: 'correction.endorse', family: 'SOURCE_DATA', desc: 'Endorse correction request' },
      { code: 'correction.dispatch', family: 'SOURCE_DATA', desc: 'Dispatch correction to source' },
      { code: 'audit.view', family: 'SOURCE_DATA', desc: 'View audit log in jurisdiction' },
      { code: 'audit.view.own', family: 'SOURCE_DATA', desc: 'View own audit records' },
    ];

    for (let i = 0; i < permissionDefs.length; i++) {
      const p = permissionDefs[i];
      await client.query(`
        INSERT INTO permissions (id, code, family, description, created_at)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (id) DO UPDATE SET
          description = EXCLUDED.description
      `, [`perm-${String(i + 1).padStart(4, '0')}`, p.code, p.family, p.desc, now]);
    }

    const rolePermMap: Record<string, string[]> = {
      DIV_COMM: [
        'application.view', 'application.monitor.subordinate', 'application.reassign',
        'officer.appoint', 'parcel.view.jurisdiction', 'village.record.monitor',
        'source.parcel.read', 'correction.request', 'correction.endorse', 'correction.dispatch', 'audit.view',
      ],
      DIST_COLL: [
        'application.view', 'application.hold', 'application.return', 'application.reject',
        'application.monitor.subordinate', 'application.reassign', 'officer.appoint',
        'parcel.view.jurisdiction', 'village.record.monitor',
        'source.parcel.read', 'correction.request', 'correction.endorse', 'correction.dispatch', 'audit.view',
      ],
      SDO: [
        'application.view', 'application.forward', 'application.hold', 'application.return',
        'application.reject', 'application.approve.final', 'application.monitor.subordinate',
        'application.reassign', 'officer.appoint', 'parcel.view.jurisdiction', 'village.record.monitor',
        'source.parcel.read', 'correction.request', 'correction.endorse', 'audit.view',
      ],
      TEHSILDAR: [
        'application.view', 'application.verify.detailed', 'application.forward',
        'application.hold', 'application.return', 'application.reject',
        'application.monitor.subordinate', 'officer.appoint', 'parcel.view.jurisdiction', 'village.record.monitor',
        'source.parcel.read', 'correction.request', 'correction.endorse', 'audit.view',
      ],
      CIRCLE_OFF: [
        'application.view', 'application.verify.basic', 'application.forward',
        'application.hold', 'application.return', 'application.reject',
        'application.monitor.subordinate', 'handshake.verify', 'officer.appoint',
        'parcel.view.jurisdiction', 'village.record.monitor',
        'source.parcel.read', 'correction.request', 'audit.view',
      ],
      VILLAGE_OFF: [
        'application.view', 'village.record.assist', 'parcel.view.jurisdiction',
        'source.parcel.read', 'correction.request',
      ],
      CITIZEN: [
        'application.view.own', 'application.create', 'application.cancel.own',
        'parcel.lookup.public', 'source.parcel.read', 'correction.request', 'audit.view.own',
      ],
    };

    let rpIdx = 0;
    for (const [role, perms] of Object.entries(rolePermMap)) {
      for (const perm of perms) {
        rpIdx++;
        await client.query(`
          INSERT INTO role_permissions (id, role_code, permission_code, created_at)
          VALUES ($1, $2, $3, $4)
          ON CONFLICT (role_code, permission_code) DO NOTHING
        `, [`rp-${String(rpIdx).padStart(4, '0')}`, role, perm, now]);
      }
    }

    // 8. Land Taxes
    console.log('💰 Seeding land taxes (Khajana)...');
    for (let i = 0; i < 45; i++) {
      const parcelId = `parcel-${String(i + 1).padStart(4, '0')}`;
      const ownerId = `cit-${String(1 + (i % 30)).padStart(4, '0')}`;
      const isDefaulter = (i % 3 === 0);
      const baseLiability = 1000 + (i * 100);
      const arrears = isDefaulter ? 2000 + (i * 50) : 0;
      const surcharges = isDefaulter ? 500 : 0;
      const totalOutstanding = baseLiability + arrears + surcharges;
      const status = isDefaulter ? 'PENDING' : 'PAID';
      const dueDate = '2026-03-31T00:00:00.000Z';
      const paidAt = isDefaulter ? null : '2025-10-15T10:00:00.000Z';
      const receiptNum = isDefaulter ? null : `TX-${String(i+1).padStart(6, '0')}`;

      await client.query(`
        INSERT INTO land_taxes (id, parcel_id, citizen_id, financial_year, base_liability, accumulated_arrears, late_surcharges, total_outstanding, status, due_date, paid_at, receipt_number, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO UPDATE SET
          total_outstanding = EXCLUDED.total_outstanding,
          status = EXCLUDED.status,
          updated_at = EXCLUDED.updated_at
      `, [
        `tax-${String(i + 1).padStart(4, '0')}`,
        parcelId, ownerId, '2025-26',
        baseLiability, arrears, surcharges, totalOutstanding,
        status, dueDate, paidAt, receiptNum, now, now
      ]);
    }

    await client.query('COMMIT');
    console.log('✅ PostgreSQL seed complete!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ PostgreSQL seed failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module || process.argv[1]?.includes('seed-pg')) {
  runPgSeed()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
