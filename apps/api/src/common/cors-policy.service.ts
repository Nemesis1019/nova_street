import { normalizeHost } from '@ecommerce/shared';
import { Injectable } from '@nestjs/common';

import { TenantRegistryService } from '../tenant/tenant-registry.service';

/**
 * Política CORS multi-tenant:
 * - Orígenes estáticos de la plataforma (`FRONTEND_URL`/`ADMIN_URL`).
 * - Subdominios de las bases de plataforma (`PLATFORM_BASE_DOMAINS`, ej. nova.app).
 * - Dominios de clientes registrados en la BD maestra.
 *
 * En desarrollo se permite cualquier origen (igual que antes) para no
 * bloquear pruebas locales.
 */
@Injectable()
export class CorsPolicyService {
  private readonly staticOrigins: string[];
  private readonly baseDomains: string[];

  constructor(private readonly registry: TenantRegistryService) {
    const origins = (process.env.FRONTEND_URL ?? '')
      .split(',')
      .map((value) => value.trim().replace(/\/$/, ''))
      .filter(Boolean);
    if (process.env.ADMIN_URL) origins.push(process.env.ADMIN_URL.trim().replace(/\/$/, ''));
    this.staticOrigins = [...new Set(origins)];

    this.baseDomains = (process.env.PLATFORM_BASE_DOMAINS ?? 'nova.app')
      .split(',')
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
  }

  async isAllowedOrigin(origin?: string | null): Promise<boolean> {
    if (!origin) return true;
    if (process.env.NODE_ENV !== 'production') return true;

    const cleaned = origin.replace(/\/$/, '');
    if (this.staticOrigins.includes(cleaned)) return true;

    let url: URL;
    try {
      url = new URL(cleaned);
    } catch {
      return false;
    }
    if (url.protocol !== 'https:') return false;

    const host = normalizeHost(url.host);
    if (!host) return false;

    if (this.baseDomains.some((base) => host === base || host.endsWith(`.${base}`))) {
      return true;
    }

    // Dominio propio de un cliente (registrado en la maestra).
    const tenant = await this.registry.resolveByHost(host);
    return Boolean(tenant);
  }
}

/** true si el origen del request y la API no comparten dominio registrable. */
export function isCrossSiteRequest(req: {
  headers: { origin?: string; referer?: string; host?: string };
}): boolean {
  if (process.env.NODE_ENV !== 'production') return false;

  const rawOrigin = req.headers.origin ?? req.headers.referer;
  const apiHost = (req.headers.host ?? '').split(':')[0];
  if (!rawOrigin || !apiHost) return false;

  try {
    const originHost = new URL(rawOrigin).hostname;
    return registrableDomain(originHost) !== registrableDomain(apiHost);
  } catch {
    return false;
  }
}

function registrableDomain(host: string): string {
  return host
    .toLowerCase()
    .split('.')
    .filter(Boolean)
    .slice(-2)
    .join('.');
}

export function cookieSameSite(req: {
  headers: { origin?: string; referer?: string; host?: string };
}): 'strict' | 'none' {
  return isCrossSiteRequest(req) ? 'none' : 'strict';
}
