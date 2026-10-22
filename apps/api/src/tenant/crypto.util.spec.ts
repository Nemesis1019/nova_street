import { decryptSecret, encryptSecret, isEncrypted } from './crypto.util';

describe('crypto.util (secretos en reposo)', () => {
  const originalSecret = process.env.PLATFORM_SECRET;
  const originalPrevious = process.env.PLATFORM_SECRET_PREVIOUS;

  beforeEach(() => {
    process.env.PLATFORM_SECRET = 'test-platform-secret';
    delete process.env.PLATFORM_SECRET_PREVIOUS;
  });

  afterAll(() => {
    if (originalSecret === undefined) delete process.env.PLATFORM_SECRET;
    else process.env.PLATFORM_SECRET = originalSecret;

    if (originalPrevious === undefined) delete process.env.PLATFORM_SECRET_PREVIOUS;
    else process.env.PLATFORM_SECRET_PREVIOUS = originalPrevious;
  });

  it('cifra y descifra un secreto (AES-256-GCM)', () => {
    const encrypted = encryptSecret('sk_live_super_secret');
    expect(encrypted.startsWith('enc:v1:')).toBe(true);
    expect(encrypted).not.toContain('sk_live_super_secret');
    expect(isEncrypted(encrypted)).toBe(true);
    expect(decryptSecret(encrypted)).toBe('sk_live_super_secret');
  });

  it('mantiene compatibilidad con valores en claro', () => {
    expect(isEncrypted('plain-value')).toBe(false);
    expect(decryptSecret('plain-value')).toBe('plain-value');
  });

  it('permite rotar la clave con PLATFORM_SECRET_PREVIOUS', () => {
    process.env.PLATFORM_SECRET = 'old-secret';
    const encrypted = encryptSecret('rotate-me');

    process.env.PLATFORM_SECRET = 'new-secret';
    process.env.PLATFORM_SECRET_PREVIOUS = 'old-secret';

    expect(decryptSecret(encrypted)).toBe('rotate-me');
  });
});
