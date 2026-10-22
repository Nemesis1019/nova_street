import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import type { Request } from 'express';

import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { BackupService } from '../backup/backup.service';
import { MasterPrismaService } from '../prisma/master-prisma.service';
import { decryptSecret, encryptSecret } from '../tenant/crypto.util';
import type { TenantContextData } from '../tenant/tenant-context.service';
import { TenantContextService } from '../tenant/tenant-context.service';
import { TenantPrismaFactory } from '../tenant/tenant-prisma.factory';
import { TenantRegistryService } from '../tenant/tenant-registry.service';
import type { CreateTenantDto, UpdateTenantDto } from './dto/platform.dto';
import type { ImpersonateTenantDto } from './dto/platform-auth.dto';
import { type PlatformActor,PlatformAuditService } from './platform-audit.service';
import { PlatformAuthService } from './platform-auth.service';
import {
  buildTenantDatabaseUrl,
  latestMigrationName,
  provisionTenant,
  runTenantMigrations,
} from './provisioning';

interface TenantRowWithDomains {
  id: string;
  slug: string;
  name: string;
  status: TenantContextData['status'];
  databaseUrl: string;
  r2Bucket: string | null;
  r2Endpoint: string | null;
  r2AccessKeyId: string | null;
  r2SecretAccessKey: string | null;
  r2PublicUrl: string | null;
  domains: Array<{ host: string; isPrimary: boolean }>;
}

@Injectable()
export class PlatformService {
  constructor(
    private readonly master: MasterPrismaService,
    private readonly registry: TenantRegistryService,
    private readonly context: TenantContextService,
    private readonly tenantPrisma: TenantPrismaFactory,
    private readonly tenantAudit: AuditService,
    private readonly platformAudit: PlatformAuditService,
    private readonly backup: BackupService,
    private readonly auth: AuthService,
    private readonly platformAuth: PlatformAuthService,
  ) {}

  async list() {
    const rows = await this.master.tenant.findMany({
      include: { domains: true },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'asc' }],
    });

    return rows.map((row) => this.toSummary(row));
  }

  /** Vista pública del tenant (nunca expone la URL de BD ni credenciales R2). */
  private toSummary(row: {
    id: string;
    slug: string;
    name: string;
    status: string;
    isDefault: boolean;
    provisioningError: string | null;
    r2Bucket: string | null;
    createdAt: Date;
    domains: Array<{ host: string; isPrimary: boolean }>;
  }) {
    const primary = row.domains.find((domain) => domain.isPrimary) ?? row.domains[0];
    return {
      id: row.id,
      slug: row.slug,
      name: row.name,
      status: row.status,
      isDefault: row.isDefault,
      provisioningError: row.provisioningError,
      domains: row.domains.map((domain) => domain.host),
      storefrontUrl: primary ? this.storefrontUrl(primary.host) : null,
      createdAt: row.createdAt,
      hasCustomStorage: Boolean(row.r2Bucket),
    };
  }

  async create(dto: CreateTenantDto, actor: PlatformActor, req?: Request) {
    const slug = dto.slug.trim().toLowerCase();
    if (!/^[a-z0-9][a-z0-9-]{1,40}$/.test(slug)) {
      throw new BadRequestException('El slug solo puede tener minúsculas, números y guiones (2-41 caracteres)');
    }

    const existing = await this.master.tenant.findUnique({ where: { slug } });
    if (existing) throw new BadRequestException(`Ya existe un cliente con el slug "${slug}"`);

    const masterUrl = process.env.MASTER_DATABASE_URL;
    if (!masterUrl && !dto.databaseUrl) {
      throw new BadRequestException('Falta MASTER_DATABASE_URL para derivar la BD del cliente');
    }

    const databaseUrl =
      dto.databaseUrl?.trim() || buildTenantDatabaseUrl(masterUrl as string, slug);

    // 1) Registro inmediato (PROVISIONING) + dominio.
    const row = await this.master.tenant.create({
      data: {
        slug,
        name: dto.name.trim(),
        databaseUrl: encryptSecret(databaseUrl),
        status: 'PROVISIONING',
        isDefault: false,
        domains: dto.domain?.trim()
          ? { create: { host: dto.domain.trim().toLowerCase(), isPrimary: true } }
          : undefined,
      },
      include: { domains: true },
    });

    await this.platformAudit.log(
      actor,
      {
        action: 'PLATFORM_CREATE_TENANT',
        entity: 'Tenant',
        entityId: row.id,
        metadata: { slug, name: row.name, databaseUrl: '[redacted]' },
      },
      req,
    );

    // 2) Provisioning en background (crear BD, migrar, seed, admin).
    void this.runProvisioning(row.id, {
      slug,
      name: row.name,
      databaseUrl,
      adminEmail: dto.adminEmail,
      adminPassword: dto.adminPassword,
      createDatabase: !dto.databaseUrl,
    });

    return this.toSummary(row);
  }

  async update(id: string, dto: UpdateTenantDto, actor: PlatformActor, req?: Request) {
    const row = await this.master.tenant.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Cliente no encontrado');

    const updated = await this.master.tenant.update({
      where: { id },
      data: {
        name: dto.name?.trim() || undefined,
        status: dto.status,
      },
    });
    this.registry.invalidate(updated.slug);

    await this.platformAudit.log(
      actor,
      {
        action: 'PLATFORM_UPDATE_TENANT',
        entity: 'Tenant',
        entityId: id,
        metadata: {
          before: { name: row.name, status: row.status },
          after: { name: updated.name, status: updated.status },
        },
      },
      req,
    );

    const withDomains = await this.master.tenant.findUniqueOrThrow({
      where: { id },
      include: { domains: true },
    });
    return this.toSummary(withDomains);
  }

  async health(id: string) {
    const row = await this.master.tenant.findUnique({ where: { id }, include: { domains: true } });
    if (!row) throw new NotFoundException('Cliente no encontrado');

    const tenant = this.toRuntimeTenant(row);

    const migrations = await this.master.tenantMigration.findMany({
      where: { tenantId: id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    try {
      const counts = await this.context.run(tenant, async () => {
        const client = this.tenantPrisma.getClient();
        const [products, orders, users, lastMigration] = await Promise.all([
          client.product.count(),
          client.order.count(),
          client.user.count(),
          client.$queryRaw<Array<{ migration_name: string }>>`
            SELECT migration_name FROM _prisma_migrations WHERE finished_at IS NOT NULL ORDER BY finished_at DESC LIMIT 1
          `,
        ]);
        return { products, orders, users, lastMigration: lastMigration[0]?.migration_name ?? null };
      });

      return { ok: true, ...counts, migrations };
    } catch (error) {
      return { ok: false, error: (error as Error).message, migrations };
    }
  }

  /** Aplica las migraciones pendientes a todos los clientes activos. */
  async migrateAll(actor: PlatformActor = {}, req?: Request) {
    const rows = await this.master.tenant.findMany({ where: { status: { not: 'SUSPENDED' } } });
    const results: Array<{ slug: string; ok: boolean; error?: string }> = [];

    await this.platformAudit.log(
      actor,
      { action: 'PLATFORM_MIGRATE_ALL', entity: 'Tenant', metadata: { tenants: rows.length } },
      req,
    );

    for (const row of rows) {
      const startedAt = Date.now();
      const databaseUrl = decryptSecret(row.databaseUrl);
      try {
        runTenantMigrations(databaseUrl);
        const name = (await latestMigrationName(databaseUrl)) ?? 'migrate deploy';
        await this.recordMigration(row.id, {
          name,
          status: 'APPLIED',
          durationMs: Date.now() - startedAt,
        });
        results.push({ slug: row.slug, ok: true });
      } catch (error) {
        const message = (error as Error).message;
        await this.recordMigration(row.id, {
          name: 'migrate deploy',
          status: 'FAILED',
          durationMs: Date.now() - startedAt,
          error: message,
        });
        results.push({ slug: row.slug, ok: false, error: message });
      }
    }

    return results;
  }

  /** Historial de migraciones/ejecuciones de un cliente. */
  async migrations(id: string, limit = 20) {
    const tenant = await this.master.tenant.findUnique({ where: { id } });
    if (!tenant) throw new NotFoundException('Cliente no encontrado');

    return this.master.tenantMigration.findMany({
      where: { tenantId: id },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 100),
    });
  }

  private async recordMigration(
    tenantId: string,
    input: {
      name: string;
      status: 'APPLIED' | 'FAILED';
      durationMs: number;
      error?: string;
    },
  ) {
    await this.master.tenantMigration.create({
      data: {
        tenantId,
        name: input.name.slice(0, 200),
        status: input.status,
        durationMs: input.durationMs,
        error: input.error?.slice(0, 1000) ?? null,
      },
    });
  }

  private async runProvisioning(
    id: string,
    input: {
      slug: string;
      name: string;
      databaseUrl: string;
      adminEmail?: string;
      adminPassword?: string;
      createDatabase?: boolean;
    },
  ) {
    const startedAt = Date.now();
    try {
      await provisionTenant({ master: this.master, ...input });
      const name = (await latestMigrationName(input.databaseUrl)) ?? 'provisioning';
      await this.master.tenant.update({
        where: { id },
        data: { status: 'ACTIVE', provisioningError: null },
      });
      await this.recordMigration(id, {
        name,
        status: 'APPLIED',
        durationMs: Date.now() - startedAt,
      });
      this.registry.invalidate(input.slug);
    } catch (error) {
      const message = (error as Error).message;
      await this.master.tenant.update({
        where: { id },
        data: { provisioningError: message.slice(0, 500) },
      });
      await this.recordMigration(id, {
        name: 'provisioning',
        status: 'FAILED',
        durationMs: Date.now() - startedAt,
        error: message,
      });
    }
  }

  /**
   * Cambia el cliente activo del superadmin transversal. No emite una sesión
   * de otra cuenta: el token de plataforma sigue siendo la identidad y el
   * tenant se resuelve por `X-Tenant` en cada request.
   */
  async selectTenant(id: string, actor: PlatformActor, req?: Request) {
    const row = await this.master.tenant.findUnique({ where: { id } });
    if (!row) throw new NotFoundException('Cliente no encontrado');
    if (row.status === 'SUSPENDED') {
      throw new BadRequestException('El cliente está suspendido');
    }

    await this.platformAudit.log(
      actor,
      {
        action: 'PLATFORM_SWITCH_TENANT',
        entity: 'Tenant',
        entityId: id,
        metadata: { slug: row.slug, name: row.name },
      },
      req,
    );

    return { id: row.id, slug: row.slug, name: row.name };
  }

  /**
   * Abre una sesión de administrador del cliente indicado (impersonación):
   * emite tokens para el SUPER_ADMIN activo de esa BD, con el claim del tenant
   * destino, y deja auditoría en la plataforma y en el cliente.
   */
  async impersonate(
    id: string,
    actor: PlatformActor,
    dto: ImpersonateTenantDto,
    req?: Request,
  ) {
    const row = await this.master.tenant.findUnique({ where: { id }, include: { domains: true } });
    if (!row) throw new NotFoundException('Cliente no encontrado');
    if (row.status === 'SUSPENDED') {
      throw new BadRequestException('El cliente está suspendido; activalo antes de administrarlo');
    }

    // Step-up: un operador de plataforma confirma su contraseña antes de entrar.
    if (actor.platformUserId) {
      if (dto.stepUpToken) {
        await this.platformAuth.verifyStepUp(actor.platformUserId, dto.stepUpToken);
      } else {
        await this.platformAuth.verifyPassword(actor.platformUserId, dto.password);
      }
    }

    const target = this.toRuntimeTenant(row);
    const reason = dto.reason.trim();
    const readOnly = dto.readOnly ?? false;

    await this.platformAudit.log(
      actor,
      {
        action: 'PLATFORM_IMPERSONATE',
        entity: 'Tenant',
        entityId: row.id,
        metadata: { slug: row.slug, name: row.name, reason, readOnly },
      },
      req,
    );

    return this.context.run(target, async () => {
      const admin = await this.tenantPrisma.getClient().user.findFirst({
        where: { isActive: true, isSuspended: false, role: { name: 'SUPER_ADMIN' } },
        orderBy: { createdAt: 'asc' },
      });
      if (!admin) {
        throw new NotFoundException('El cliente no tiene un administrador activo (SUPER_ADMIN)');
      }

      const session = await this.auth.issueSessionForUser(admin.id, {
        impersonatedBy: actor.platformUserId ?? actor.legacyUserId ?? 'legacy',
        readOnly,
      });

      await this.tenantAudit.log({
        userId: admin.id,
        action: 'PLATFORM_SESSION_START',
        entity: 'User',
        entityId: admin.id,
        after: {
          impersonatedBy: actor.platformUserId ?? actor.legacyUserId ?? 'legacy',
          reason,
          readOnly,
        },
      });

      return {
        ...session,
        tenant: { id: row.id, slug: row.slug, name: row.name },
      };
    });
  }

  /** Respalda la BD de cada cliente activo en `BACKUP_DIR/<slug>/`. */
  async backupAll(actor: PlatformActor = {}, req?: Request) {
    const rows = await this.master.tenant.findMany({
      where: { status: { not: 'SUSPENDED' } },
      include: { domains: true },
      orderBy: { slug: 'asc' },
    });

    await this.platformAudit.log(
      actor,
      { action: 'PLATFORM_BACKUP_ALL', entity: 'Tenant', metadata: { tenants: rows.length } },
      req,
    );

    const results: Array<{ slug: string; ok: boolean; filename?: string; error?: string }> = [];
    for (const row of rows) {
      try {
        const result = await this.context.run(this.toRuntimeTenant(row), () => this.backup.runBackup());
        results.push({ slug: row.slug, ok: true, filename: result.filename });
      } catch (error) {
        results.push({ slug: row.slug, ok: false, error: (error as Error).message });
      }
    }

    return results;
  }

  private toRuntimeTenant(row: TenantRowWithDomains): TenantContextData {
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

  private storefrontUrl(host: string): string {
    if (host === 'localhost' || host.endsWith('.localhost')) {
      const frontend = process.env.FRONTEND_URL?.split(',')[0]?.trim() ?? 'http://localhost:3000';
      try {
        const port = new URL(frontend).port || '3000';
        return `http://${host}:${port}`;
      } catch {
        return frontend;
      }
    }
    const scheme = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    return `${scheme}://${host}`;
  }
}
