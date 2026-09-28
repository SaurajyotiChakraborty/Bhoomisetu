// Bhoomisetu — Transfer State Machine (§8.3)
// THE ONLY way application.status may change. Direct assignment is a bug.

import type { TransferStatus, RoleCode, AuthUser } from '@/lib/types';

export interface TransferApplication {
  id: string;
  status: TransferStatus;
  sellerId: string;
  buyerId: string;
  parcelId: string;
  heldFromStatus?: string | null;
  handshakeAttempts: number;
  handshakeResendsUsed: number;
}

export interface TransitionResult {
  success: boolean;
  error?: {
    code: 'INVALID_TRANSITION' | 'FORBIDDEN_ACTION' | 'OUT_OF_JURISDICTION' | 'PRECONDITION_FAILED';
    message: string;
  };
}

export type PreconditionFn = (app: TransferApplication, actor: AuthUser) => TransitionResult;

export interface Transition {
  from: TransferStatus;
  to: TransferStatus;
  allowedRoles: RoleCode[];
  requiresJurisdictionMatch: boolean;
  requiresReason: boolean;
  preconditions: PreconditionFn[];
}

// ========================
// Precondition Functions
// ========================

const isSeller: PreconditionFn = (app, actor) => {
  if (actor.uid !== app.sellerId && actor.id !== app.sellerId) {
    return { success: false, error: { code: 'FORBIDDEN_ACTION', message: 'Only the seller can perform this action' } };
  }
  return { success: true };
};

const isBuyer: PreconditionFn = (app, actor) => {
  if (actor.uid !== app.buyerId && actor.id !== app.buyerId) {
    return { success: false, error: { code: 'FORBIDDEN_ACTION', message: 'Only the buyer can perform this action' } };
  }
  return { success: true };
};

const isParty: PreconditionFn = (app, actor) => {
  if (actor.uid !== app.sellerId && actor.uid !== app.buyerId &&
      actor.id !== app.sellerId && actor.id !== app.buyerId) {
    return { success: false, error: { code: 'FORBIDDEN_ACTION', message: 'Only a party to this transaction can perform this action' } };
  }
  return { success: true };
};

const beforeCircleVerification: PreconditionFn = (app) => {
  const allowedStatuses: TransferStatus[] = [
    'BUYER_REQUEST_PENDING', 
    'MUTUAL_TOC_PENDING_SIGNATURES', 
    'MUTUAL_TOC_SIGNED',
    'PENDING_DOCUMENT_UPLOAD'
  ];
  if (!allowedStatuses.includes(app.status)) {
    return { success: false, error: { code: 'FORBIDDEN_ACTION', message: 'Cancellation only allowed before Circle Officer verification' } };
  }
  return { success: true };
};

// ========================
// Transition Table
// ========================

export const TRANSITIONS: Transition[] = [
  // 1. Buyer Request to Mutual TOC
  {
    from: 'BUYER_REQUEST_PENDING',
    to: 'MUTUAL_TOC_PENDING_SIGNATURES',
    allowedRoles: ['CITIZEN'],
    requiresJurisdictionMatch: false,
    requiresReason: false,
    preconditions: [isSeller], // Only seller can accept
  },
  
  // 1. Buyer Request Rejected by Seller
  {
    from: 'BUYER_REQUEST_PENDING',
    to: 'REJECTED',
    allowedRoles: ['CITIZEN'],
    requiresJurisdictionMatch: false,
    requiresReason: true,
    preconditions: [isSeller],
  },

  // 2. Mutual TOC Signatures Complete (auto-transition when both sign)
  {
    from: 'MUTUAL_TOC_PENDING_SIGNATURES',
    to: 'MUTUAL_TOC_SIGNED',
    allowedRoles: ['CITIZEN'],
    requiresJurisdictionMatch: false,
    requiresReason: false,
    preconditions: [],
  },

  // 3. CO Proceeds
  {
    from: 'MUTUAL_TOC_SIGNED',
    to: 'PENDING_DOCUMENT_UPLOAD',
    allowedRoles: ['CIRCLE_OFF'],
    requiresJurisdictionMatch: true,
    requiresReason: false,
    preconditions: [],
  },
  
  // 3. CO Rejects at Initial TOC stage
  {
    from: 'MUTUAL_TOC_SIGNED',
    to: 'REJECTED',
    allowedRoles: ['CIRCLE_OFF'],
    requiresJurisdictionMatch: true,
    requiresReason: true,
    preconditions: [],
  },

  // 4. Documents Uploaded via Digital Form -> CO Verification
  {
    from: 'PENDING_DOCUMENT_UPLOAD',
    to: 'AT_CIRCLE_OFFICER_VERIFICATION',
    allowedRoles: ['CITIZEN'],
    requiresJurisdictionMatch: false,
    requiresReason: false,
    preconditions: [isParty],
  },

  // Stage 5: Circle Officer forwards to Tehsildar
  {
    from: 'AT_CIRCLE_OFFICER_VERIFICATION',
    to: 'FORWARDED_TO_TEHSILDAR',
    allowedRoles: ['CIRCLE_OFF'],
    requiresJurisdictionMatch: true,
    requiresReason: true,
    preconditions: [],
  },

  {
    from: 'FORWARDED_TO_TEHSILDAR',
    to: 'AT_TEHSILDAR_VERIFICATION',
    allowedRoles: ['CIRCLE_OFF', 'TEHSILDAR'],
    requiresJurisdictionMatch: true,
    requiresReason: false,
    preconditions: [],
  },

  // Stage 6a: Tehsildar accepts documents -> TOC generation
  {
    from: 'AT_TEHSILDAR_VERIFICATION',
    to: 'TOC_PENDING_SIGNATURES',
    allowedRoles: ['TEHSILDAR'],
    requiresJurisdictionMatch: true,
    requiresReason: false,
    preconditions: [],
  },
  
  // Tehsildar rejects at verification
  {
    from: 'AT_TEHSILDAR_VERIFICATION',
    to: 'REJECTED',
    allowedRoles: ['TEHSILDAR'],
    requiresJurisdictionMatch: true,
    requiresReason: true,
    preconditions: [],
  },

  // Stage 6b: Citizens finish TOC uploads -> back to Tehsildar
  {
    from: 'TOC_PENDING_SIGNATURES',
    to: 'TOC_VERIFICATION_BY_TEHSILDAR',
    allowedRoles: ['CITIZEN'], // Auto transition when last citizen uploads
    requiresJurisdictionMatch: false,
    requiresReason: false,
    preconditions: [],
  },

  // Stage 6c: Tehsildar locks and forwards to SDO
  {
    from: 'TOC_VERIFICATION_BY_TEHSILDAR',
    to: 'FORWARDED_TO_SDO',
    allowedRoles: ['TEHSILDAR'],
    requiresJurisdictionMatch: true,
    requiresReason: true,
    preconditions: [],
  },

  // Tehsildar rejects at TOC verification
  {
    from: 'TOC_VERIFICATION_BY_TEHSILDAR',
    to: 'REJECTED',
    allowedRoles: ['TEHSILDAR'],
    requiresJurisdictionMatch: true,
    requiresReason: true,
    preconditions: [],
  },

  {
    from: 'FORWARDED_TO_SDO',
    to: 'AT_SDO_REVIEW',
    allowedRoles: ['TEHSILDAR', 'SDO'],
    requiresJurisdictionMatch: true,
    requiresReason: false,
    preconditions: [],
  },

  // Stage 7: SDO approves
  {
    from: 'AT_SDO_REVIEW',
    to: 'APPROVED_PENDING_DECLARATION',
    allowedRoles: ['SDO'],
    requiresJurisdictionMatch: true,
    requiresReason: true,
    preconditions: [],
  },
  
  // SDO directly completes transfer (bypassing signatures for testing)
  {
    from: 'AT_SDO_REVIEW',
    to: 'TRANSFER_COMPLETED',
    allowedRoles: ['SDO'],
    requiresJurisdictionMatch: true,
    requiresReason: true,
    preconditions: [],
  },

  // Stage 8: Declaration and signatures
  {
    from: 'APPROVED_PENDING_DECLARATION',
    to: 'PENDING_DIGITAL_SIGNATURES',
    allowedRoles: ['SDO', 'CITIZEN'],
    requiresJurisdictionMatch: false,
    requiresReason: false,
    preconditions: [],
  },

  {
    from: 'PENDING_DIGITAL_SIGNATURES',
    to: 'SIGNATURES_COMPLETE',
    allowedRoles: ['SDO', 'CITIZEN'],
    requiresJurisdictionMatch: false,
    requiresReason: false,
    preconditions: [],
  },

  // Stage 9: Transfer completion
  {
    from: 'SIGNATURES_COMPLETE',
    to: 'TRANSFER_COMPLETED',
    allowedRoles: ['SDO', 'CITIZEN'], // system-triggered
    requiresJurisdictionMatch: false,
    requiresReason: false,
    preconditions: [],
  },

  // ========================
  // Cross-cutting transitions
  // ========================

  // Return for correction (from various stages)
  ...(['AT_CIRCLE_OFFICER_VERIFICATION', 'AT_TEHSILDAR_VERIFICATION', 'AT_SDO_REVIEW'] as TransferStatus[]).map(from => ({
    from,
    to: 'RETURNED_FOR_CORRECTION' as TransferStatus,
    allowedRoles: ['CIRCLE_OFF', 'TEHSILDAR', 'SDO', 'DIST_COLL'] as RoleCode[],
    requiresJurisdictionMatch: true,
    requiresReason: true,
    preconditions: [] as PreconditionFn[],
  })),

  // Return from RETURNED_FOR_CORRECTION back to the appropriate stage
  {
    from: 'RETURNED_FOR_CORRECTION',
    to: 'AT_CIRCLE_OFFICER_VERIFICATION',
    allowedRoles: ['CITIZEN'],
    requiresJurisdictionMatch: false,
    requiresReason: true,
    preconditions: [isParty],
  },

  // Put on hold (from various stages)
  ...(['AT_CIRCLE_OFFICER_VERIFICATION', 'AT_TEHSILDAR_VERIFICATION', 'AT_SDO_REVIEW'] as TransferStatus[]).map(from => ({
    from,
    to: 'ON_HOLD' as TransferStatus,
    allowedRoles: ['CIRCLE_OFF', 'TEHSILDAR', 'SDO', 'DIST_COLL'] as RoleCode[],
    requiresJurisdictionMatch: true,
    requiresReason: true,
    preconditions: [] as PreconditionFn[],
  })),

  // Resume from ON_HOLD (returns to held_from_status — handled specially in transition())

  // Reject (from various stages)
  ...(['AT_CIRCLE_OFFICER_VERIFICATION', 'AT_TEHSILDAR_VERIFICATION', 'AT_SDO_REVIEW'] as TransferStatus[]).map(from => ({
    from,
    to: 'REJECTED' as TransferStatus,
    allowedRoles: ['CIRCLE_OFF', 'TEHSILDAR', 'SDO', 'DIST_COLL'] as RoleCode[],
    requiresJurisdictionMatch: true,
    requiresReason: true,
    preconditions: [] as PreconditionFn[],
  })),

  // Citizen cancellation (only before CO verification)
  {
    from: 'BUYER_REQUEST_PENDING',
    to: 'CANCELLED_BY_APPLICANT',
    allowedRoles: ['CITIZEN'],
    requiresJurisdictionMatch: false,
    requiresReason: false,
    preconditions: [isBuyer, beforeCircleVerification],
  },
  {
    from: 'MUTUAL_TOC_PENDING_SIGNATURES',
    to: 'CANCELLED_BY_APPLICANT',
    allowedRoles: ['CITIZEN'],
    requiresJurisdictionMatch: false,
    requiresReason: false,
    preconditions: [isParty, beforeCircleVerification],
  },
  {
    from: 'MUTUAL_TOC_SIGNED',
    to: 'CANCELLED_BY_APPLICANT',
    allowedRoles: ['CITIZEN'],
    requiresJurisdictionMatch: false,
    requiresReason: false,
    preconditions: [isParty, beforeCircleVerification],
  },
  {
    from: 'PENDING_DOCUMENT_UPLOAD',
    to: 'CANCELLED_BY_APPLICANT',
    allowedRoles: ['CITIZEN'],
    requiresJurisdictionMatch: false,
    requiresReason: false,
    preconditions: [isParty, beforeCircleVerification],
  }
];

// ========================
// State Machine
// ========================

export class TransferStateMachine {
  /**
   * THE ONLY method that may change application status.
   * All controllers and services must use this — never set status directly.
   */
  static transition(
    app: TransferApplication,
    to: TransferStatus,
    actor: AuthUser,
    jurisdictionPath?: string
  ): TransitionResult {
    // Find a matching transition
    const transition = TRANSITIONS.find(
      t => t.from === app.status && t.to === to
    );

    if (!transition) {
      return {
        success: false,
        error: {
          code: 'INVALID_TRANSITION',
          message: `Cannot transition from ${app.status} to ${to}`,
        },
      };
    }

    // Check role
    if (!transition.allowedRoles.includes(actor.role)) {
      return {
        success: false,
        error: {
          code: 'FORBIDDEN_ACTION',
          message: `Role ${actor.role} is not allowed to perform this transition`,
        },
      };
    }

    // Check jurisdiction
    if (transition.requiresJurisdictionMatch && actor.jurisdictionPath && jurisdictionPath) {
      if (!jurisdictionPath.startsWith(actor.jurisdictionPath)) {
        return {
          success: false,
          error: {
            code: 'OUT_OF_JURISDICTION',
            message: 'This application is outside your jurisdiction',
          },
        };
      }
    }

    // Check preconditions
    for (const precondition of transition.preconditions) {
      const result = precondition(app, actor);
      if (!result.success) {
        return result;
      }
    }

    return { success: true };
  }

  /**
   * Get all valid transitions from the current status for this actor.
   */
  static getValidTransitions(
    app: TransferApplication,
    actor: AuthUser
  ): TransferStatus[] {
    return TRANSITIONS
      .filter(t => t.from === app.status && t.allowedRoles.includes(actor.role))
      .filter(t => {
        for (const precondition of t.preconditions) {
          if (!precondition(app, actor).success) return false;
        }
        return true;
      })
      .map(t => t.to);
  }

  /**
   * Check if a transition requires a reason.
   */
  static requiresReason(from: TransferStatus, to: TransferStatus): boolean {
    const transition = TRANSITIONS.find(t => t.from === from && t.to === to);
    return transition?.requiresReason ?? true;
  }
}
