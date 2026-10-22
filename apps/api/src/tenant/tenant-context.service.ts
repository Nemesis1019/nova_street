import { Injectable } from '@nestjs/common';

import { getCurrentTenant, setFallbackTenant, type TenantRuntimeData,tenantStorage } from './tenant-runtime';

export type TenantContextData = TenantRuntimeData;

/**
 * Contexto del tenant actual por request (AsyncLocalStorage).
 * El `TenantMiddleware` lo setea al inicio de cada request; los jobs de cola
 * también lo setean antes de procesar.
 */
@Injectable()
export class TenantContextService {
  run<T>(tenant: TenantRuntimeData, callback: () => T): T {
    return tenantStorage.run(tenant, callback);
  }

  current(): TenantRuntimeData | null {
    return getCurrentTenant();
  }

  /** Tenant actual o error si no hay ninguno resuelto (no debería pasar en requests). */
  requireCurrent(): TenantRuntimeData {
    const tenant = this.current();
    if (!tenant) {
      throw new Error('No hay tenant en contexto (revisar TenantMiddleware / fallback)');
    }
    return tenant;
  }

  currentSlug(): string {
    return this.requireCurrent().slug;
  }

  /** Tenant de respaldo para código fuera de request (boot, seeds, cron). */
  setFallback(tenant: TenantRuntimeData | null): void {
    setFallbackTenant(tenant);
  }
}
