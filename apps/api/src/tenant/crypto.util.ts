import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

/**
 * Cifrado en reposo para secretos de plataforma (URLs de BD de tenants y
 * credenciales de integración en StoreConfig). AES-256-GCM con clave derivada
 * de `PLATFORM_SECRET` (fallback: `JWT_SECRET` en desarrollo).
 *
 * Rotación: durante una rotación, `PLATFORM_SECRET_PREVIOUS` permite descifrar
 * los valores viejos; `encryptSecret` siempre usa la clave actual. Re-cifrar
 * los valores con el script `encrypt:secrets` y luego quitar la variable.
 */

const PREFIX = 'enc:v1:';

function keyFrom(secret: string): Buffer {
  return createHash('sha256').update(secret).digest();
}

function getKeys(): Buffer[] {
  const current =
    process.env.PLATFORM_SECRET ?? process.env.JWT_SECRET ?? 'nova-dev-platform-secret';
  const previous = process.env.PLATFORM_SECRET_PREVIOUS;
  return [current, previous].filter((value): value is string => Boolean(value)).map(keyFrom);
}

export function isEncrypted(value: string | null | undefined): boolean {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

export function encryptSecret(plain: string): string {
  if (!plain) return plain;

  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKeys()[0], iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${PREFIX}${Buffer.concat([iv, tag, encrypted]).toString('base64')}`;
}

export function decryptSecret(value: string): string {
  // Compatibilidad con valores guardados sin cifrar (dev/migraciones).
  if (!value.startsWith(PREFIX)) return value;

  const payload = Buffer.from(value.slice(PREFIX.length), 'base64');
  const iv = payload.subarray(0, 12);
  const tag = payload.subarray(12, 28);
  const data = payload.subarray(28);

  let lastError: unknown;
  for (const key of getKeys()) {
    try {
      const decipher = createDecipheriv('aes-256-gcm', key, iv);
      decipher.setAuthTag(tag);
      return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
    } catch (error) {
      lastError = error;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('No se pudo descifrar el secreto (¿PLATFORM_SECRET cambió?)');
}
