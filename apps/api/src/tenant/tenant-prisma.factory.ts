import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { TenantContextService } from './tenant-context.service';

/**
 * Caché acotada (LRU) de clientes Prisma por tenant.
 *
 * Cada cliente abre su propio pool contra la BD del cliente. Para no agotar
 * memoria/conexiones con muchos tenants, se limita a
 * `TENANT_PRISMA_MAX_CLIENTS` (50 por defecto) y se liberan los menos usados.
 * La desconexión se difiere 30 s para no cortar queries en vuelo.
 */
@Injectable()
export class TenantPrismaFactory implements OnModuleDestroy {
  private readonly logger = new Logger(TenantPrismaFactory.name);
  private readonly clients = new Map<string, { client: PrismaClient; lastUsedAt: number }>();
  private readonly maxClients = Math.max(
    1,
    Number(process.env.TENANT_PRISMA_MAX_CLIENTS ?? 50) || 50,
  );

  constructor(private readonly context: TenantContextService) {}

  getClient(): PrismaClient {
    const tenant = this.context.requireCurrent();
    const existing = this.clients.get(tenant.slug);
    if (existing) {
      // "Touch" para LRU.
      existing.lastUsedAt = Date.now();
      this.clients.delete(tenant.slug);
      this.clients.set(tenant.slug, existing);
      return existing.client;
    }

    const client = new PrismaClient({ datasourceUrl: tenant.databaseUrl });
    this.clients.set(tenant.slug, { client, lastUsedAt: Date.now() });
    this.logger.log(`Prisma conectado a la BD del tenant "${tenant.slug}"`);
    this.evictIfNeeded();
    return client;
  }

  private evictIfNeeded(): void {
    while (this.clients.size > this.maxClients) {
      const oldest = this.clients.entries().next().value as
        | [string, { client: PrismaClient; lastUsedAt: number }]
        | undefined;
      if (!oldest) return;

      const [slug, entry] = oldest;
      this.clients.delete(slug);

      // Se desconecta con gracia para no abortar queries en curso. Si el
      // tenant vuelve a pedir un cliente antes, se crea uno nuevo.
      const timer = setTimeout(() => {
        if (!this.clients.has(slug)) {
          entry.client.$disconnect().catch(() => undefined);
        }
      }, 30_000);
      timer.unref?.();

      this.logger.log(`Prisma cliente "${slug}" liberado por LRU (max ${this.maxClients})`);
    }
  }

  get size(): number {
    return this.clients.size;
  }

  async onModuleDestroy() {
    await Promise.all(
      [...this.clients.values()].map(({ client }) => client.$disconnect().catch(() => undefined)),
    );
    this.clients.clear();
  }
}
