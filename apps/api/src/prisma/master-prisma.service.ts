import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/master-client';

/**
 * Cliente de la BASE MAESTRA de la plataforma (tenants, dominios).
 * Es independiente del `PrismaService` (que resuelve la BD de cada tenant).
 */
@Injectable()
export class MasterPrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MasterPrismaService.name);

  async onModuleInit() {
    try {
      await this.$connect();
    } catch (error) {
      // La API sigue funcionando en modo single-tenant (fallback a DATABASE_URL).
      this.logger.warn(`No se pudo conectar a la BD maestra: ${(error as Error).message}`);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect().catch(() => undefined);
  }
}
