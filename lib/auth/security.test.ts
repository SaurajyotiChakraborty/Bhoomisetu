import { describe, it, expect } from 'vitest';
import Database from 'better-sqlite3';
import { hashPassword, verifyPassword, validatePasswordPolicy, generateSecurePassword } from './password';
import { encrypt, decrypt, maskAadhaar, maskPAN } from './encryption';

describe('Security & Cryptography Suite', () => {
  describe('Password Hashing & Policies', () => {
    it('hashes passwords using Argon2id and verifies successfully', async () => {
      const pwd = 'Valid@SecurePassword123';
      const hash = await hashPassword(pwd);
      expect(hash).toContain('$argon2id$');

      const isMatch = await verifyPassword(hash, pwd);
      expect(isMatch).toBe(true);

      const isMismatch = await verifyPassword(hash, 'WrongPassword123!');
      expect(isMismatch).toBe(false);
    });

    it('enforces password complexity and blocks weak passwords', () => {
      // Weak: too short
      expect(validatePasswordPolicy('Abc!1').valid).toBe(false);
      // Weak: common password
      expect(validatePasswordPolicy('Password@123').valid).toBe(false);
      // Strong: meets all requirements
      const strong = generateSecurePassword(14);
      expect(validatePasswordPolicy(strong).valid).toBe(true);
    });
  });

  describe('PII Encryption & Masking', () => {
    it('encrypts and decrypts Aadhaar and PAN using AES-256-GCM', () => {
      const aadhaar = '234567890123';
      const pan = 'ABCDE1234F';

      const encAadhaar = encrypt(aadhaar);
      const encPan = encrypt(pan);

      expect(encAadhaar).not.toBe(aadhaar);
      expect(encPan).not.toBe(pan);
      // AES-256-GCM string structure (iv:authTag:ciphertext)
      expect(encAadhaar.split(':').length).toBe(3);
      expect(encPan.split(':').length).toBe(3);

      expect(decrypt(encAadhaar)).toBe(aadhaar);
      expect(decrypt(encPan)).toBe(pan);
    });

    it('masks Aadhaar and PAN properly without leaking full identifiers', () => {
      const maskedAadhaar = maskAadhaar('234567890123');
      expect(maskedAadhaar).toBe('XXXX XXXX 0123');

      const maskedPan = maskPAN('ABCDE1234F');
      expect(maskedPan).toBe('ABCDE****F');
    });
  });

  describe('Database Security & Immutability Triggers', () => {
    const db = new Database('./data/bhoomisetu.db');

    it('strictly forbids updating or deleting append-only audit_log entries', () => {
      const res = db.prepare(`
        INSERT INTO audit_log (actor_id, actor_type, action, entity_type, entity_id, created_at)
        VALUES ('sec-test', 'SYSTEM', 'TEST_SECURITY', 'TEST', 'test-1', datetime('now'))
      `).run();
      const rowId = res.lastInsertRowid;

      expect(() => {
        db.prepare('UPDATE audit_log SET action = ? WHERE id = ?').run('MODIFIED', rowId);
      }).toThrow(/AUDIT_LOG_IMMUTABLE/);

      expect(() => {
        db.prepare('DELETE FROM audit_log WHERE id = ?').run(rowId);
      }).toThrow(/AUDIT_LOG_IMMUTABLE/);
    });

    it('strictly forbids changing citizen_uid or officer_uid', () => {
      const citizen = db.prepare('SELECT id FROM citizens LIMIT 1').get() as { id: string };
      expect(() => {
        db.prepare('UPDATE citizens SET citizen_uid = ? WHERE id = ?').run('HACKED_UID', citizen.id);
      }).toThrow(/IDENTIFIER_IMMUTABLE/);

      const officer = db.prepare('SELECT id FROM officers LIMIT 1').get() as { id: string };
      expect(() => {
        db.prepare('UPDATE officers SET officer_uid = ? WHERE id = ?').run('HACKED_UID', officer.id);
      }).toThrow(/IDENTIFIER_IMMUTABLE/);
    });

    it('strictly protects parcel government source fields against modifications', () => {
      const parcel = db.prepare('SELECT id, survey_number, khatian_number, parcel_uid FROM parcels LIMIT 1').get() as {
        id: string;
        survey_number: string;
        khatian_number: string;
        parcel_uid: string;
      };

      expect(() => {
        db.prepare('UPDATE parcels SET survey_number = ? WHERE id = ?').run('MOD_SURVEY', parcel.id);
      }).toThrow(/SOURCE_FIELD_PROTECTED/);

      expect(() => {
        db.prepare('UPDATE parcels SET khatian_number = ? WHERE id = ?').run('MOD_KHATIAN', parcel.id);
      }).toThrow(/SOURCE_FIELD_PROTECTED/);

      expect(() => {
        db.prepare('UPDATE parcels SET parcel_uid = ? WHERE id = ?').run('MOD_UID', parcel.id);
      }).toThrow(/SOURCE_FIELD_PROTECTED/);
    });
  });
});
