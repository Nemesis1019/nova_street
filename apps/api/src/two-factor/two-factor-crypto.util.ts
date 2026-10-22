import { createCipheriv, createDecipheriv, createHash, randomBytes, scryptSync } from 'node:crypto';

/**
 * Cifrado del secreto TOTP en reposo (AES-256-GCM).
 * Clave: TOTP_ENCRYPTION_KEY (hex de 64 chars o passphrase).
 * Fallback de desarrollo: derivada de JWT_SECRET (misma fuente que firma los tokens).
 */
const ALGORITHM = 'aes-256-gcm';

function getKey(): Buffer {
  const raw = process.env.TOTP_ENCRYPTION_KEY;
  if (raw && /^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  if (raw && raw.length > 0) {
    return createHash('sha256').update(raw).digest();
  }
  const fallback = process.env.JWT_SECRET ?? 'nova-dev-secret';
  return scryptSync(fallback, 'nova-2fa-secret', 32);
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

export function decryptSecret(payload: string): string {
  const [ivHex, tagHex, dataHex] = payload.split(':');
  if (!ivHex || !tagHex || !dataHex) {
    throw new Error('Invalid encrypted 2FA secret');
  }
  const decipher = createDecipheriv(ALGORITHM, getKey(), Buffer.from(ivHex, 'hex'));
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'));
  return Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]).toString('utf8');
}
