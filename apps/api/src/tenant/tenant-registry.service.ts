import { hostToTenantSlug, normalizeHost } from '@ecommerce/shared';
import { Injectable, Logger, type OnModuleInit } from '@nestjs/common';

import { MasterPrismaService } from '../prisma/master-prisma.service';
import { decryptSecret, encryptSecret } from './crypto.util';
import type { TenantContextData } from './tenant-context.service';
import { TenantContextService } from './tenant-context.service';

interface TenantRow {
  id: string;
  slug: string;
  name: string;
  status: TenantContextData['status'];
  databaseUrl: string;
  isDefault: boolean;
  r2Bucket: string | null;
  r2Endpoint: string | null;
  r2AccessKeyId: string | null;
  r2SecretAccessKey: string | null;
  r2PublicUrl: string | null;
  domains: Array<{ host: string; isPrimary: boolean }>;
}

const CACHE_TTL_MS = 30_000;

/**
 * Registro de clientes (tenants) de la plataforma.
 * Resuelve slug/dominio → datos de conexión, con caché corta en memoria.
 * Si la BD maestra no está disponible, cae al modo single-tenant usando
 * `DATABASE_URL` (así la tienda actual sigue funcionando sin master).
 */
@Injectable()
export class TenantRegistryService implements OnModuleInit {
  private readonly logger = new Logger(TenantRegistryService.name);
  private readonly cache = new Map<string, { tenant: TenantContextData | null; expiresAt: number }>();
  private defaultCache: { tenant: TenantContextData | null; expiresAt: number } | null = null;
  private masterAvailable = true;

  constructor(
    private readonly master: MasterPrismaService,
    private readonly context: TenantContextService,
  ) {}

  async onModuleInit() {
    try {
      const fallback = await this.getDefault();
      this.context.setFallback(fallback);
      this.logger.log(`Tenant por defecto: ${fallback?.slug ?? 'ninguno'}`);
    } catch (error) {
      this.logger.warn(`No se pudo resolver el tenant por defecto: ${(error as Error).message}`);
    }
  }

  /** Resuelve por slug (header `X-Tenant`) o por host (dominio/subdominio). */
  async resolve(input: { slug?: string | null; host?: string | null }): Promise<TenantContextData | null> {
    const slug = input.slug?.trim().toLowerCase();
    if (slug) {
      const bySlug = await this.resolveBySlug(slug);
      if (bySlug) return bySlug;
    }

    const host = normalizeHost(input.host);
    if (host) {
      const byHost = await this.resolveByHost(host);
      if (byHost) return byHost;

      const subdomain = hostToTenantSlug(host);
      if (subdomain) {
        const bySubdomain = await this.resolveBySlug(subdomain);
        if (bySubdomain) return bySubdomain;
      }
    }

    return null;
  }

  async resolveBySlug(slug: string): Promise<TenantContextData | null> {
    const cached = this.cache.get(slug);
    if (cached && Date.now() < cached.expiresAt) return cached.tenant;

    try {
      const row = await this.master.tenant.findUnique({
        where: { slug },
        include: { domains: true },
      });
      this.masterAvailable = true;
      const tenant = row ? this.toContext(row) : null;
      this.cache.set(slug, { tenant, expiresAt: Date.now() + CACHE_TTL_MS });
      return tenant;
    } catch (error) {
      this.masterAvailable = false;
      this.logger.warn(`Master no disponible al resolver "${slug}": ${(error as Error).message}`);
      // En producción NUNCA se cae a la BD por defecto con otro slug: eso
      // serviría datos de un cliente bajo el dominio de otro. Fail-closed.
      return this.allowsSingleTenantFallback() ? this.fallbackTenant(slug) : null;
    }
  }

  async resolveByHost(host: string): Promise<TenantContextData | null> {
    try {
      const domain = await this.master.tenantDomain.findUnique({
        where: { host },
        include: { tenant: { include: { domains: true } } },
      });
      this.masterAvailable = true;
      return domain ? this.toContext(domain.tenant) : null;
    } catch (error) {
      this.masterAvailable = false;
      this.logger.warn(`Master no disponible al resolver el host "${host}": ${(error as Error).message}`);
      return null;
    }
  }

  /** true si la última consulta a la BD maestra falló. */
  isMasterDown(): boolean {
    return !this.masterAvailable;
  }

  /** El fallback single-tenant (DATABASE_URL) solo se permite en dev o explícitamente. */
  allowsSingleTenantFallback(): boolean {
    return (
      process.env.NODE_ENV !== 'production' ||
      process.env.ALLOW_SINGLE_TENANT_FALLBACK === 'true'
    );
  }

  async getDefault(): Promise<TenantContextData | null> {
    if (this.defaultCache && Date.now() < this.defaultCache.expiresAt) {
      return this.defaultCache.tenant;
    }

    const envSlug = process.env.DEFAULT_TENANT_SLUG?.trim().toLowerCase();
    let tenant: TenantContextData | null = null;

    try {
      const row = envSlug
        ? await this.master.tenant.findUnique({ where: { slug: envSlug }, include: { domains: true } })
        : ((await this.master.tenant.findFirst({ where: { isDefault: true }, include: { domains: true } })) ??
          (await this.master.tenant.findFirst({ include: { domains: true }, orderBy: { createdAt: 'asc' } })));

      this.masterAvailable = true;
      tenant = row ? this.toContext(row) : null;
    } catch (error) {
      this.masterAvailable = false;
      this.logger.warn(`Master no disponible al resolver el tenant por defecto: ${(error as Error).message}`);
      // Se conserva el último default cacheado (si existe); el fallback a
      // DATABASE_URL solo aplica en dev o con el flag explícito.
      tenant = this.defaultCache?.tenant ?? (this.allowsSingleTenantFallback()
        ? this.fallbackTenant(envSlug ?? 'default')
        : null);
    }

    this.defaultCache = { tenant, expiresAt: Date.now() + CACHE_TTL_MS };
    return tenant;
  }

  async listAll() {
    return this.master.tenant.findMany({
      include: { domains: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });
  }

  async create(data: {
    slug: string;
    name: string;
    databaseUrl: string;
    isDefault?: boolean;
    domains?: string[];
  }) {
    const row = await this.master.tenant.create({
      data: {
        slug: data.slug.toLowerCase(),
        name: data.name,
        databaseUrl: encryptSecret(data.databaseUrl),
        isDefault: data.isDefault ?? false,
        domains: data.domains?.length
          ? {
              create: data.domains.map((host, index) => ({
                host: normalizeHost(host) ?? host,
                isPrimary: index === 0,
              })),
            }
          : undefined,
      },
      include: { domains: true },
    });

    this.invalidate(data.slug);
    return row;
  }

  async update(
    id: string,
    data: { name?: string; status?: TenantContextData['status']; isDefault?: boolean },
  ) {
    const row = await this.master.tenant.update({ where: { id }, data });
    this.invalidate(row.slug);
    return row;
  }

  async addDomain(tenantId: string, host: string, isPrimary = false) {
    const row = await this.master.tenantDomain.create({
      data: { tenantId, host: normalizeHost(host) ?? host, isPrimary },
    });
    this.invalidate();
    return row;
  }

  invalidate(slug?: string) {
    if (slug) this.cache.delete(slug.toLowerCase());
    else this.cache.clear();
    this.defaultCache = null;
  }

  /** Modo single-tenant: usa la DATABASE_URL del entorno como único tenant. */
  private fallbackTenant(slug: string): TenantContextData | null {
    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) return null;

    return {
      id: `fallback:${slug}`,
      slug,
      name: process.env.STORE_NAME ?? slug,
      status: 'ACTIVE',
      databaseUrl,
      primaryDomain: null,
      domains: [],
      r2: {},
    };
  }

  private toContext(row: TenantRow): TenantContextData {
    const primary = row.domains.find((domain) => domain.isPrimary) ?? row.domains[0];
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      status: row.status,
      databaseUrl: decryptSecret(row.databaseUrl),
      primaryDomain: primary?.host ?? null,
      domains: row.domains.map((domain) => domain.host),
      r2: {
        bucket: row.r2Bucket ?? undefined,
        endpoint: row.r2Endpoint ?? undefined,
        accessKeyId: row.r2AccessKeyId ?? undefined,
        secretAccessKey: row.r2SecretAccessKey ?? undefined,
        publicUrl: row.r2PublicUrl ?? undefined,
      },
    };
  }
}
