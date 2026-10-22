import { getCurrentTenant } from './tenant-runtime';

/**
 * URL base del storefront del tenant actual.
 * Usa el dominio principal registrado en la BD maestra; en dev (localhost)
 * cae a `STOREFRONT_URL` / `FRONTEND_URL`.
 */
export function getTenantStorefrontUrl(): string {
  const fallback = (
    process.env.STOREFRONT_URL ??
    process.env.FRONTEND_URL?.split(',')[0]?.trim() ??
    'http://localhost:3000'
  ).replace(/\/$/, '');

  const domain = getCurrentTenant()?.primaryDomain;
  if (!domain || domain === 'localhost') {
    return fallback;
  }

  // En dev los subdominios *.localhost funcionan en el navegador: se conserva
  // el subdominio y el puerto del storefront (ej. demo.localhost:3000).
  if (domain.endsWith('.localhost')) {
    try {
      const port = new URL(fallback).port || '3000';
      return `http://${domain}:${port}`;
    } catch {
      return fallback;
    }
  }

  const scheme = process.env.NODE_ENV === 'production' ? 'https' : 'http';
  return `${scheme}://${domain}`;
}

/** URL absoluta dentro del storefront del tenant actual. */
export function tenantStorefrontUrl(path: string): string {
  const base = getTenantStorefrontUrl();
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}
