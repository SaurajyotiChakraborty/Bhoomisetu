// Bhoomisetu — Zod Validation Schemas
// Every request body validated per §3.2, §13

import { z } from 'zod';

// ========================
// Common Validators
// ========================

export const indianMobileSchema = z.string().regex(/^[6-9]\d{9}$/, 'Invalid Indian mobile number');

export const aadhaarSchema = z.string()
  .regex(/^\d{12}$/, 'Aadhaar must be exactly 12 digits')
  .refine(val => !val.startsWith('0') && !val.startsWith('1'), 'Aadhaar cannot start with 0 or 1');

export const panSchema = z.string()
  .regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, 'Invalid PAN format')
  .refine(val => 'PCHFATBLJG'.includes(val[3]), '4th character must be one of P, C, H, F, A, T, B, L, J, G');

export const pinSchema = z.string().regex(/^\d{6}$/, 'PIN must be exactly 6 digits');

export const passwordSchema = z.string()
  .min(10, 'Password must be at least 10 characters')
  .refine(val => /[A-Z]/.test(val), 'Must contain an uppercase letter')
  .refine(val => /[a-z]/.test(val), 'Must contain a lowercase letter')
  .refine(val => /[0-9]/.test(val), 'Must contain a digit')
  .refine(val => /[!@#$%^&*()_+\-=\[\]{}|;':",.<>?/`~]/.test(val), 'Must contain a symbol');

// ========================
// Citizen Registration (§3.2)
// ========================

export const citizenRegistrationSchema = z.object({
  fullName: z.string()
    .min(3, 'Name must be at least 3 characters')
    .max(100, 'Name must be at most 100 characters')
    .regex(/^[a-zA-Z\s.]+$/, 'Name can only contain letters, spaces, and dots'),
  email: z.string().email('Invalid email address'),
  mobile: indianMobileSchema,
  aadhaar: aadhaarSchema,
  aadhaarLinkedMobile: indianMobileSchema,
  pan: panSchema,
  dateOfBirth: z.string().refine(val => {
    const dob = new Date(val);
    const today = new Date();
    const age = today.getFullYear() - dob.getFullYear();
    const monthDiff = today.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
      return age - 1 >= 18;
    }
    return age >= 18;
  }, 'Must be at least 18 years old'),
  addressLine1: z.string().min(1, 'Address line 1 is required'),
  addressLine2: z.string().optional(),
  villageTown: z.string().min(1, 'Village/town is required'),
  district: z.string().min(1, 'District is required'),
  state: z.string().min(1, 'State is required'),
  pin: pinSchema,
});

export type CitizenRegistrationInput = z.infer<typeof citizenRegistrationSchema>;

// ========================
// Login (§3.5)
// ========================

export const loginSchema = z.object({
  identifier: z.string().min(1, 'Identifier is required'),
  password: z.string().min(1, 'Password is required'),
  mode: z.enum(['CITIZEN', 'EMPLOYEE']),
});

export type LoginInput = z.infer<typeof loginSchema>;

// ========================
// OTP
// ========================

export const otpSendSchema = z.object({
  channel: z.enum(['EMAIL', 'SMS']),
  destination: z.string().min(1),
  purpose: z.enum(['REGISTRATION', 'FORGOT_PASSWORD', 'VERIFICATION']),
});

export const otpVerifySchema = z.object({
  destination: z.string().min(1),
  code: z.string().length(6, 'OTP must be exactly 6 digits').regex(/^\d{6}$/, 'OTP must be numeric'),
  purpose: z.enum(['REGISTRATION', 'FORGOT_PASSWORD', 'VERIFICATION']),
});

// ========================
// Password Change
// ========================

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const forgotPasswordInitSchema = z.object({
  identifier: z.string().min(1),
});

export const forgotPasswordResetSchema = z.object({
  identifier: z.string().min(1),
  emailOtp: z.string().length(6).regex(/^\d{6}$/),
  mobileOtp: z.string().length(6).regex(/^\d{6}$/),
  newPassword: passwordSchema,
});

// ========================
// Officer Appointment (§5)
// ========================

export const officerAppointmentSchema = z.object({
  fullName: z.string().min(3).max(100),
  email: z.string().email(),
  mobile: indianMobileSchema,
  roleCode: z.enum(['DIST_COLL', 'SDO', 'TEHSILDAR', 'CIRCLE_OFF', 'VILLAGE_OFF']),
  jurisdictionId: z.string().min(1),
  reason: z.string().min(20, 'Reason must be at least 20 characters'),
});

export type OfficerAppointmentInput = z.infer<typeof officerAppointmentSchema>;

// ========================
// Transfer Application (§8.2 Stage 1)
// ========================

export const createTransferSchema = z.object({
  parcelId: z.string().min(1),
  buyerCitizenUid: z.string().min(1),
  transferType: z.enum(['SALE', 'GIFT', 'INHERITANCE', 'PARTITION', 'EXCHANGE']),
  considerationAmount: z.number().min(0).optional(),
  isPartialTransfer: z.boolean().default(false),
  partialArea: z.number().positive().optional(),
  partialGeometry: z.string().optional(),         // GeoJSON
});

export type CreateTransferInput = z.infer<typeof createTransferSchema>;

// ========================
// Transfer Actions
// ========================

export const transferResponseSchema = z.object({
  action: z.enum(['ACCEPT', 'DECLINE']),
  reason: z.string().optional(),
});

export const handshakeVerifySchema = z.object({
  sellerCode: z.string().length(6).regex(/^[0-9A-F]{6}$/, 'Must be a 6-digit hex code'),
  buyerCode: z.string().length(6).regex(/^[0-9A-F]{6}$/, 'Must be a 6-digit hex code'),
});

export const transferActionSchema = z.object({
  reason: z.string().min(20, 'Reason must be at least 20 characters'),
  returnTo: z.enum(['CITIZEN', 'CIRCLE_OFF', 'TEHSILDAR']).optional(),
});

export const verificationChecklistSchema = z.object({
  items: z.array(z.object({
    name: z.string(),
    status: z.enum(['PASS', 'FAIL', 'NOT_APPLICABLE']),
    comment: z.string().optional(),
  })),
  reason: z.string().min(20, 'Reason must be at least 20 characters'),
});

export const feeVerificationSchema = z.object({
  stampDuty: z.object({
    expected: z.number(),
    paid: z.number(),
    challanReference: z.string(),
    paymentDate: z.string(),
    verdict: z.enum(['VERIFIED', 'MISMATCH']),
  }),
  registrationFee: z.object({
    expected: z.number(),
    paid: z.number(),
    challanReference: z.string(),
    paymentDate: z.string(),
    verdict: z.enum(['VERIFIED', 'MISMATCH']),
  }),
  mutationFee: z.object({
    expected: z.number(),
    paid: z.number(),
    challanReference: z.string(),
    paymentDate: z.string(),
    verdict: z.enum(['VERIFIED', 'MISMATCH']),
  }).optional(),
  reason: z.string().min(20),
});

export const sdoApprovalSchema = z.object({
  approvalNote: z.string().min(20, 'Approval note must be at least 20 characters'),
  orderReference: z.string().min(1, 'Order reference is required'),
  stepUpPassword: z.string().min(1, 'Password confirmation required'),
});

// ========================
// Correction Request (§6.3)
// ========================

export const correctionRequestSchema = z.object({
  parcelId: z.string().min(1),
  field: z.string().min(1),
  currentValue: z.string(),
  proposedValue: z.string().min(1),
  reason: z.string().min(20),
});

export const correctionActionSchema = z.object({
  action: z.enum(['ENDORSE', 'DISPATCH', 'ACCEPT', 'REJECT']),
  note: z.string().min(10).optional(),
});
