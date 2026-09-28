// Bhoomisetu — Encryption Utilities
// AES-256-GCM for Aadhaar and PAN at-rest encryption

import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'bhoomisetu-dev-key-32-bytes-min!'; // Must be 32 bytes
const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const key = ENCRYPTION_KEY;
  // Ensure exactly 32 bytes
  return crypto.createHash('sha256').update(key).digest();
}

export function encrypt(plaintext: string): string {
  const key = getKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decrypt(encryptedData: string): string {
  const key = getKey();
  const [ivHex, authTagHex, ciphertext] = encryptedData.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

export function maskAadhaar(aadhaar: string): string {
  // Show last 4 digits: XXXX XXXX 1234
  const last4 = aadhaar.slice(-4);
  return `XXXX XXXX ${last4}`;
}

export function maskPAN(pan: string): string {
  // Show first 5 and last 1: ABCDE****F
  return `${pan.slice(0, 5)}****${pan.slice(-1)}`;
}

export function maskCitizenId(citizenId: string): string {
  // Show format but mask middle: BSC-AS-****-****2317
  const parts = citizenId.split('-');
  if (parts.length >= 4) {
    return `${parts[0]}-${parts[1]}-****-****${parts[3].slice(-4)}`;
  }
  return citizenId.replace(/.(?=.{4})/g, '*');
}

export function computeSHA256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}
