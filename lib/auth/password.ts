// Bhoomisetu — Password Hashing (Argon2id)
// Used for passwords, OTPs, and hex handshake codes

import argon2 from 'argon2';
import crypto from 'crypto';

// Common password blocklist (subset — extend as needed)
const BLOCKED_PASSWORDS = new Set([
  'password123', 'qwerty12345', 'letmein1234', '12345678901',
  'iloveyou123', 'admin12345!', 'welcome1234', 'monkey12345',
  'dragon12345', 'master12345', 'password!23', 'abc12345678',
  'Password@123', 'Pass@1234567', 'Qwerty@1234',
]);

export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 65536,     // 64 MB
    timeCost: 3,
    parallelism: 4,
  });
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  try {
    return await argon2.verify(hash, password);
  } catch {
    return false;
  }
}

export function generateSecurePassword(length: number = 12): string {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghjkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%^&*()_+-=';
  const all = upper + lower + digits + symbols;

  let password = '';
  // Ensure at least one of each type
  password += upper[crypto.randomInt(upper.length)];
  password += lower[crypto.randomInt(lower.length)];
  password += digits[crypto.randomInt(digits.length)];
  password += symbols[crypto.randomInt(symbols.length)];

  // Fill remaining
  for (let i = password.length; i < length; i++) {
    password += all[crypto.randomInt(all.length)];
  }

  // Shuffle
  const arr = password.split('');
  for (let i = arr.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr.join('');
}

export function validatePasswordPolicy(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < 10) {
    errors.push('Password must be at least 10 characters');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one digit');
  }
  if (!/[!@#$%^&*()_+\-=\[\]{}|;':",.<>?/`~]/.test(password)) {
    errors.push('Password must contain at least one symbol');
  }
  if (BLOCKED_PASSWORDS.has(password)) {
    errors.push('This password is too common');
  }

  return { valid: errors.length === 0, errors };
}

export async function isPasswordReused(
  newPassword: string,
  passwordHistory: string[]
): Promise<boolean> {
  for (const oldHash of passwordHistory.slice(0, 5)) {
    if (await verifyPassword(oldHash, newPassword)) {
      return true;
    }
  }
  return false;
}
