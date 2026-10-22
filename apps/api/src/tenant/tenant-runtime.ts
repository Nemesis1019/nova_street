import { AsyncLocalStorage } from 'node:async_hooks';

import type { TenantStatus } from '@prisma/master-client';

export interface TenantR2Config {
  bucket?: string;
  endpoint?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  publicUrl?: string;
}

export interface TenantRuntimeData {
  id: string;
  slug: string;
  name: string;
  status: TenantStatus;
  databaseUrl: string;
  primaryDomain: string | null;
  /** Todos los hosts registrados para el cliente (para CORS y fail-closed). */
  domains: string[];
  /** Overrides de R2 por cliente (si están vacíos se usan los de la plataforma). */
  r2: TenantR2Config;
}

/**
 * AsyncLocalStorage compartido (fuera del contenedor de DI) para que
 * utilidades puras (caché, URLs de assets, etc.) puedan conocer el tenant
 * actual sin recibir el servicio por parámetro.
 */
export const tenantStorage = new AsyncLocalStorage<TenantRuntimeData>();

let fallbackTenant: TenantRuntimeData | null = null;

export function getCurrentTenant(): TenantRuntimeData | null {
  return tenantStorage.getStore() ?? fallbackTenant;
}

export function getCurrentTenantSlug(): string | null {
  return getCurrentTenant()?.slug ?? null;
}

export function setFallbackTenant(tenant: TenantRuntimeData | null): void {
  fallbackTenant = tenant;
}
