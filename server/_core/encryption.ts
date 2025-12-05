/**
 * Encryption utilities for protecting sensitive patient data at rest
 *
 * Uses AES-256-GCM for authenticated encryption of sensitive fields
 *
 * CRITICAL: Ensure ENCRYPTION_KEY environment variable is set to a 32-byte hex string
 * Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import crypto from 'crypto';
import { ENV } from './env';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard IV length
const AUTH_TAG_LENGTH = 16; // GCM authentication tag length
const ENCODING: BufferEncoding = 'hex';

/**
 * Get encryption key from environment
 * @throws Error if ENCRYPTION_KEY is not set or invalid
 */
function getEncryptionKey(): Buffer {
  const keyHex = process.env.ENCRYPTION_KEY;

  if (!keyHex) {
    throw new Error(
      'ENCRYPTION_KEY environment variable is not set. ' +
      'Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }

  const key = Buffer.from(keyHex, 'hex');

  if (key.length !== 32) {
    throw new Error(
      `ENCRYPTION_KEY must be exactly 32 bytes (64 hex characters). ` +
      `Received ${key.length} bytes. ` +
      `Generate a new one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    );
  }

  return key;
}

/**
 * Encrypt a field value using AES-256-GCM
 *
 * @param plaintext - The value to encrypt
 * @returns Encrypted value in format: iv:authTag:ciphertext (all hex-encoded)
 * @throws Error if encryption fails
 *
 * @example
 * const encrypted = encryptField("123.456.789-00");
 * // Returns: "a1b2c3d4e5f6g7h8i9j0k1l2:m1n2o3p4q5r6s7t8u9v0w1x2y3z4a5b6:c1d2e3f4g5h6i7j8"
 */
export function encryptField(plaintext: string | null | undefined): string | null {
  // Handle null/undefined - store as null in database
  if (plaintext === null || plaintext === undefined || plaintext === '') {
    return null;
  }

  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let ciphertext = cipher.update(plaintext, 'utf8', ENCODING);
    ciphertext += cipher.final(ENCODING);

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext
    return `${iv.toString(ENCODING)}:${authTag.toString(ENCODING)}:${ciphertext}`;
  } catch (error) {
    console.error('[Encryption] Failed to encrypt field:', error);
    throw new Error('Failed to encrypt sensitive data');
  }
}

/**
 * Decrypt a field value encrypted with encryptField
 *
 * @param encryptedValue - The encrypted value in format: iv:authTag:ciphertext
 * @returns Decrypted plaintext value
 * @throws Error if decryption fails or authentication fails
 *
 * @example
 * const decrypted = decryptField("a1b2c3d4e5f6g7h8i9j0k1l2:m1n2o3p4q5r6s7t8u9v0w1x2y3z4a5b6:c1d2e3f4g5h6i7j8");
 * // Returns: "123.456.789-00"
 */
export function decryptField(encryptedValue: string | null | undefined): string | null {
  // Handle null/undefined
  if (encryptedValue === null || encryptedValue === undefined || encryptedValue === '') {
    return null;
  }

  try {
    const key = getEncryptionKey();
    const parts = encryptedValue.split(':');

    if (parts.length !== 3) {
      throw new Error('Invalid encrypted value format. Expected format: iv:authTag:ciphertext');
    }

    const [ivHex, authTagHex, ciphertext] = parts;
    const iv = Buffer.from(ivHex, ENCODING);
    const authTag = Buffer.from(authTagHex, ENCODING);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let plaintext = decipher.update(ciphertext, ENCODING, 'utf8');
    plaintext += decipher.final('utf8');

    return plaintext;
  } catch (error) {
    console.error('[Encryption] Failed to decrypt field:', error);
    throw new Error('Failed to decrypt sensitive data. Data may be corrupted or key may be incorrect.');
  }
}

/**
 * Encrypt multiple fields in an object
 *
 * @param data - Object with fields to encrypt
 * @param fieldsToEncrypt - Array of field names to encrypt
 * @returns New object with specified fields encrypted
 *
 * @example
 * const encrypted = encryptFields(
 *   { name: "João", cpf: "123.456.789-00", email: "joao@example.com" },
 *   ["cpf"]
 * );
 * // Returns: { name: "João", cpf: "iv:tag:ciphertext", email: "joao@example.com" }
 */
export function encryptFields<T extends Record<string, any>>(
  data: T,
  fieldsToEncrypt: (keyof T)[]
): T {
  const result = { ...data };

  for (const field of fieldsToEncrypt) {
    if (field in result) {
      const value = result[field];
      if (typeof value === 'string' || value === null || value === undefined) {
        result[field] = encryptField(value as string | null | undefined) as any;
      }
    }
  }

  return result;
}

/**
 * Decrypt multiple fields in an object
 *
 * @param data - Object with encrypted fields
 * @param fieldsToDecrypt - Array of field names to decrypt
 * @returns New object with specified fields decrypted
 *
 * @example
 * const decrypted = decryptFields(
 *   { name: "João", cpf: "iv:tag:ciphertext", email: "joao@example.com" },
 *   ["cpf"]
 * );
 * // Returns: { name: "João", cpf: "123.456.789-00", email: "joao@example.com" }
 */
export function decryptFields<T extends Record<string, any>>(
  data: T,
  fieldsToDecrypt: (keyof T)[]
): T {
  const result = { ...data };

  for (const field of fieldsToDecrypt) {
    if (field in result) {
      const value = result[field];
      if (typeof value === 'string' || value === null || value === undefined) {
        result[field] = decryptField(value as string | null | undefined) as any;
      }
    }
  }

  return result;
}

/**
 * List of sensitive fields that should be encrypted in the patients table
 */
export const PATIENT_ENCRYPTED_FIELDS = ['cpf', 'medicalHistory', 'allergies', 'medications'] as const;

/**
 * List of sensitive fields that should be encrypted in the consultations table
 */
export const CONSULTATION_ENCRYPTED_FIELDS = ['transcript'] as const;
