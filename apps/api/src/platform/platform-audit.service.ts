import { Injectable } from '@nestjs/common';
import type { Request } from 'express';

import { MasterPrismaService } from '../prisma/master-prisma.service';

export interface PlatformActor {
  platformUserId?: string;
  legacyUserId?: string;
  email?: string;
  role?: string;
}

export interface PlatformAuditInput {
  action: string;
  entity?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Auditoría centralizada de la plataforma (BD maestra), con el operador que
 * ejecutó la acción, IP y user-agent. Independiente de la auditoría de cada
 * tenant.
 */
@Injectable()
export class PlatformAuditService {
  constructor(private readonly master: MasterPrismaService) {}

  async log(actor: PlatformActor, input: PlatformAuditInput, req?: Request) {
    await this.master.platformAuditLog.create({
      data: {
        platformUserId: actor.platformUserId ?? null,
        action: input.action,
        entity: input.entity ?? null,
        entityId: input.entityId ?? null,
        metadata: (input.metadata ?? {}) as object,
        ip: req?.ip ?? null,
        userAgent: req?.headers['user-agent']?.slice(0, 500) ?? null,
      },
    });
  }

  async list(limit = 50) {
    return this.master.platformAuditLog.findMany({
      orderBy: { createdAt: 'desc' },
      take: Math.min(Math.max(limit, 1), 200),
      include: { platformUser: { select: { id: true, email: true, name: true, role: true } } },
    });
  }
}
