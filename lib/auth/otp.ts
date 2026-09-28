// Bhoomisetu — OTP Generation & Verification
// 6 numeric digits, TTL 10 min, max 5 attempts, max 3 resends/hr/destination

import crypto from 'crypto';
import { hashPassword, verifyPassword } from './password';

export function generateOTP(): string {
  // 6 numeric digits, cryptographically random
  return crypto.randomInt(100000, 999999).toString();
}

export async function hashOTP(otp: string): Promise<string> {
  return hashPassword(otp);
}

export async function verifyOTP(hash: string, otp: string): Promise<boolean> {
  return verifyPassword(hash, otp);
}

export function generateHexCode(): string {
  // 6-digit hexadecimal code for handshake (§8.2)
  const bytes = crypto.randomBytes(3);
  return bytes.toString('hex').toUpperCase();
}

export function getOTPExpiry(): string {
  return new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes
}

export function getHandshakeExpiry(): string {
  return new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(); // 72 hours
}

export function isExpired(expiresAt: string): boolean {
  return new Date(expiresAt) < new Date();
}
