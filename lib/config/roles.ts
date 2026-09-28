// Bhoomisetu — Role & Permission Configuration
// This is the single source of truth for the permission matrix (§4.5)

import type { RoleCode, Permission } from '@/lib/types';

export interface RoleDefinition {
  code: RoleCode;
  name: string;
  level: number;
  scope: string;
  dashboardRoute: string;
  allowsMultiple?: boolean;
}

export const ROLES: Record<RoleCode, RoleDefinition> = {
  DIV_COMM: {
    code: 'DIV_COMM',
    name: 'Division Commissioner',
    level: 1,
    scope: 'DIVISION',
    dashboardRoute: '/dashboard/division',
  },
  DIST_COLL: {
    code: 'DIST_COLL',
    name: 'District Collector',
    level: 2,
    scope: 'DISTRICT',
    dashboardRoute: '/dashboard/district',
  },
  SDO: {
    code: 'SDO',
    name: 'Sub-Collector / SDO',
    level: 3,
    scope: 'SUBDIVISION',
    dashboardRoute: '/dashboard/sdo',
  },
  TEHSILDAR: {
    code: 'TEHSILDAR',
    name: 'Tehsildar',
    level: 4,
    scope: 'TEHSIL',
    dashboardRoute: '/dashboard/tehsildar',
  },
  CIRCLE_OFF: {
    code: 'CIRCLE_OFF',
    name: 'Circle / Revenue Officer',
    level: 5,
    scope: 'CIRCLE',
    dashboardRoute: '/dashboard/circle',
  },
  VILLAGE_OFF: {
    code: 'VILLAGE_OFF',
    name: 'Village / Gram Panchayat Officer',
    level: 6,
    scope: 'VILLAGE',
    dashboardRoute: '/dashboard/village',
  },
  CITIZEN: {
    code: 'CITIZEN',
    name: 'Citizen / Landowner',
    level: 7,
    scope: 'SELF',
    dashboardRoute: '/dashboard/citizen',
  },
};

// Permission matrix from §4.5
// Two families: Workflow (Family A) and Source-data (Family B)
export const ROLE_PERMISSIONS: Record<RoleCode, Permission[]> = {
  DIV_COMM: [
    // Workflow
    'application.view',
    'application.monitor.subordinate',
    'application.reassign',
    'officer.appoint',
    'parcel.view.jurisdiction',
    'village.record.monitor',
    // Source-data
    'source.parcel.read',
    'correction.request',
    'correction.endorse',
    'correction.dispatch',
    'audit.view',
  ],
  DIST_COLL: [
    'application.view',
    'application.hold',
    'application.return',
    'application.reject',
    'application.monitor.subordinate',
    'application.reassign',
    'officer.appoint',
    'parcel.view.jurisdiction',
    'village.record.monitor',
    'source.parcel.read',
    'correction.request',
    'correction.endorse',
    'correction.dispatch',
    'audit.view',
  ],
  SDO: [
    'application.view',
    'application.forward',
    'application.hold',
    'application.return',
    'application.reject',
    'application.approve.final',
    'application.monitor.subordinate',
    'application.reassign',
    'officer.appoint',
    'parcel.view.jurisdiction',
    'village.record.monitor',
    'source.parcel.read',
    'correction.request',
    'correction.endorse',
    'audit.view',
  ],
  TEHSILDAR: [
    'application.view',
    'application.verify.detailed',
    'application.forward',
    'application.hold',
    'application.return',
    'application.reject',
    'application.monitor.subordinate',
    'officer.appoint',
    'parcel.view.jurisdiction',
    'village.record.monitor',
    'source.parcel.read',
    'correction.request',
    'correction.endorse',
    'audit.view',
  ],
  CIRCLE_OFF: [
    'application.view',
    'application.verify.basic',
    'application.forward',
    'application.hold',
    'application.return',
    'application.reject',
    'application.monitor.subordinate',
    'handshake.verify',
    'officer.appoint',
    'parcel.view.jurisdiction',
    'village.record.monitor',
    'source.parcel.read',
    'correction.request',
    'audit.view',
  ],
  VILLAGE_OFF: [
    'application.view',
    'village.record.assist',
    'parcel.view.jurisdiction',
    'source.parcel.read',
    'correction.request',
  ],
  CITIZEN: [
    'application.view.own',
    'application.create',
    'application.cancel.own',
    'parcel.lookup.public',
    'source.parcel.read',
    'correction.request',
    'audit.view.own',
  ],
};

// Role code prefixes for officer UID generation
export const ROLE_CODE_MAP: Record<RoleCode, string> = {
  DIV_COMM: 'DVC',
  DIST_COLL: 'DCL',
  SDO: 'SDO',
  TEHSILDAR: 'TEH',
  CIRCLE_OFF: 'CRO',
  VILLAGE_OFF: 'VLO',
  CITIZEN: 'CIT',
};

// Verify that source.parcel.write and source.owner.write are NEVER assigned
const allAssignedPermissions = Object.values(ROLE_PERMISSIONS).flat();
if (allAssignedPermissions.includes('source.parcel.write') || allAssignedPermissions.includes('source.owner.write')) {
  throw new Error('CRITICAL: source.parcel.write or source.owner.write must NEVER be assigned to any role');
}
