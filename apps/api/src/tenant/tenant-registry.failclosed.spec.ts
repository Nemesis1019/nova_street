import { TenantContextService } from './tenant-context.service';
import { TenantRegistryService } from './tenant-registry.service';

function buildService(masterError = true) {
  const master = {
    tenant: {
      findUnique: jest.fn().mockImplementation(() => {
        if (masterError) return Promise.reject(new Error('master down'));
        return Promise.resolve(null);
      }),
      findFirst: jest.fn().mockImplementation(() => {
        if (masterError) return Promise.reject(new Error('master down'));
        return Promise.resolve(null);
      }),
    },
    tenantDomain: {
      findUnique: jest.fn().mockImplementation(() => {
        if (masterError) return Promise.reject(new Error('master down'));
        return Promise.resolve(null);
      }),
    },
  };

  return new TenantRegistryService(master as never, new TenantContextService());
}

describe('TenantRegistryService — fail-closed', () => {
  const originalEnv = {
    NODE_ENV: process.env.NODE_ENV,
    DATABASE_URL: process.env.DATABASE_URL,
    ALLOW_SINGLE_TENANT_FALLBACK: process.env.ALLOW_SINGLE_TENANT_FALLBACK,
  };

  beforeEach(() => {
    process.env.DATABASE_URL = 'postgresql://user:pass@localhost:5432/ecommerce';
    delete process.env.ALLOW_SINGLE_TENANT_FALLBACK;
  });

  afterAll(() => {
    process.env.NODE_ENV = originalEnv.NODE_ENV;
    if (originalEnv.DATABASE_URL === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = originalEnv.DATABASE_URL;
    if (originalEnv.ALLOW_SINGLE_TENANT_FALLBACK === undefined) {
      delete process.env.ALLOW_SINGLE_TENANT_FALLBACK;
    } else {
      process.env.ALLOW_SINGLE_TENANT_FALLBACK = originalEnv.ALLOW_SINGLE_TENANT_FALLBACK;
    }
  });

  it('en producción NO cae a la BD por defecto con otro slug (evita fuga entre tenants)', async () => {
    process.env.NODE_ENV = 'production';
    const service = buildService(true);

    await expect(service.resolveBySlug('demo')).resolves.toBeNull();
    expect(service.isMasterDown()).toBe(true);
    expect(service.allowsSingleTenantFallback()).toBe(false);
  });

  it('en producción getDefault devuelve null si la maestra está caída y no hay caché', async () => {
    process.env.NODE_ENV = 'production';
    const service = buildService(true);

    await expect(service.getDefault()).resolves.toBeNull();
  });

  it('en desarrollo mantiene el fallback single-tenant', async () => {
    process.env.NODE_ENV = 'development';
    const service = buildService(true);

    const tenant = await service.resolveBySlug('demo');
    expect(tenant?.slug).toBe('demo');
    expect(tenant?.databaseUrl).toBe(process.env.DATABASE_URL);
    expect(tenant?.domains).toEqual([]);
  });

  it('permite el fallback en producción solo con ALLOW_SINGLE_TENANT_FALLBACK=true', async () => {
    process.env.NODE_ENV = 'production';
    process.env.ALLOW_SINGLE_TENANT_FALLBACK = 'true';
    const service = buildService(true);

    await expect(service.resolveBySlug('demo')).resolves.toMatchObject({ slug: 'demo' });
  });
});
