import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

import { TenantContextService } from '../tenant/tenant-context.service';
import { TenantPrismaFactory } from '../tenant/tenant-prisma.factory';

/**
 * Cliente Prisma "del tenant actual".
 *
 * Se comporta como un `PrismaClient` (los servicios siguen usando
 * `this.prisma.product.findMany(...)`, `this.prisma.$transaction(...)`, etc.),
 * pero en cada acceso delega al cliente de la BD del tenant resuelto en el
 * request (AsyncLocalStorage). El cliente base (`super()`) solo aporta el tipo
 * y nunca se usa para consultas.
 */
@Injectable()
export class PrismaService extends PrismaClient {
  constructor(
    private readonly tenantPrisma: TenantPrismaFactory,
    private readonly tenantContext: TenantContextService,
  ) {
    super();

    return new Proxy(this, {
      get: (target, prop, receiver) => {
        if (
          typeof prop === 'symbol' ||
          prop === 'then' ||
          prop === 'tenantPrisma' ||
          prop === 'tenantContext'
        ) {
          return Reflect.get(target, prop, receiver);
        }

        // Sin tenant resuelto (boot/DI/scripts): usar el cliente base
        // (`DATABASE_URL` por defecto) para no romper el ciclo de vida de Nest.
        if (!tenantContext.current()) {
          return Reflect.get(target, prop, receiver);
        }

        const client = tenantPrisma.getClient();
        const value = Reflect.get(client as object, prop);
        return typeof value === 'function'
          ? (value as (...args: unknown[]) => unknown).bind(client)
          : value;
      },
    });
  }
}
