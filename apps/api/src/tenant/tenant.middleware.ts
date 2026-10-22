import { normalizeHost } from '@ecommerce/shared';
import { Injectable, type NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { TenantContextService } from './tenant-context.service';
import { TenantRegistryService } from './tenant-registry.service';

function hostFromOrigin(value: string | undefined): string | undefined {
  if (!value) return undefined;
  try {
    return new URL(value).host;
  } catch {
    return undefined;
  }
}

/**
 * Resuelve el tenant de cada request y lo deja en AsyncLocalStorage:
 * 1. Header `X-Tenant` (storefront/admin explícito).
 * 2. Host del `Origin`/`Referer` (navegador cross-origin) o `Host` de la API.
 * 3. Tenant por defecto (`DEFAULT_TENANT_SLUG` / `isDefault`).
 */
@Injectable()
export class TenantMiddleware implements NestMiddleware {
  constructor(
    private readonly registry: TenantRegistryService,
    private readonly context: TenantContextService,
  ) {}

  async use(req: Request, res: Response, next: NextFunction) {
    const headerValue = req.headers['x-tenant'];
    const headerSlug = typeof headerValue === 'string' ? headerValue.trim().toLowerCase() : undefined;
    // Webhooks de pago: el tenant viaja en la URL (`?tenant=<slug>`).
    const queryValue = typeof req.query?.tenant === 'string' ? req.query.tenant.trim().toLowerCase() : undefined;
    const explicitSlug = headerSlug ?? queryValue;

    const origin = (req.headers.origin as string | undefined) ?? (req.headers.referer as string | undefined);
    const host = hostFromOrigin(origin) ?? req.headers.host;

    // Un tenant explícito inexistente es un error (no caemos al default).
    if (explicitSlug) {
      const tenant = await this.registry.resolve({ slug: explicitSlug });
      if (!tenant) {
        if (this.registry.isMasterDown() && !this.registry.allowsSingleTenantFallback()) {
          return this.platformUnavailable(res);
        }
        res.status(404).json({
          statusCode: 404,
          message: `Tienda "${explicitSlug}" no encontrada`,
          error: 'Not Found',
        });
        return;
      }
      return this.dispatch(tenant, res, next);
    }

    const normalizedHost = normalizeHost(host);
    let tenant = await this.registry.resolve({ host });
    let usedDefault = false;

    if (!tenant) {
      tenant = await this.registry.getDefault();
      usedDefault = Boolean(tenant);
    }

    if (!tenant) {
      if (this.registry.isMasterDown()) return this.platformUnavailable(res);
      res.status(404).json({
        statusCode: 404,
        message: 'No se pudo resolver la tienda para este dominio',
        error: 'Not Found',
      });
      return;
    }

    // Fail-closed: con la maestra caída no se sirve el tenant por defecto en
    // un host que no le pertenece (evita exponer datos de otro cliente).
    const failClosed = this.registry.isMasterDown() && !this.registry.allowsSingleTenantFallback();
    if (
      failClosed &&
      usedDefault &&
      normalizedHost &&
      !(tenant.domains ?? []).includes(normalizedHost)
    ) {
      return this.platformUnavailable(res);
    }

    return this.dispatch(tenant, res, next);
  }

  private platformUnavailable(res: Response) {
    res.status(503).json({
      statusCode: 503,
      message: 'Plataforma temporalmente no disponible. Intentá de nuevo en unos segundos.',
      error: 'Service Unavailable',
    });
  }

  private dispatch(
    tenant: NonNullable<Awaited<ReturnType<TenantRegistryService['resolve']>>>,
    res: Response,
    next: NextFunction,
  ) {
    if (tenant.status === 'SUSPENDED') {
      res.status(503).json({
        statusCode: 503,
        message: 'Esta tienda está temporalmente suspendida',
        error: 'Service Unavailable',
      });
      return;
    }

    // Detalle útil para frontends/observabilidad.
    res.setHeader('X-Tenant', tenant.slug);
    this.context.run(tenant, () => next());
  }
}
