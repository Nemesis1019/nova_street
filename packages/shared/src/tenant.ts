/**
 * Utilidades de multi-tenancy compartidas entre API y frontends.
 *
 * Convención de dominios: cada cliente vive en un subdominio de la plataforma
 * (`cliente.nova.app` → slug `cliente`). En desarrollo también se acepta
 * `cliente.localhost`.
 */

/** Extrae el slug del tenant a partir del host (sin puerto). */
export function hostToTenantSlug(host: string | null | undefined): string | null {
  if (!host) return null;

  const clean = host.split(':')[0]?.trim().toLowerCase();
  if (!clean) return null;

  // IPs y localhost sin subdominio → sin tenant explícito.
  if (clean === 'localhost' || /^\d{1,3}(\.\d{1,3}){3}$/.test(clean)) return null;

  const parts = clean.split('.');
  if (parts.length >= 3) return parts[0] || null;
  // Dev: cliente.localhost
  if (parts.length === 2 && parts[1] === 'localhost') return parts[0] || null;

  return null;
}

/** Host sin puerto, en minúsculas. */
export function normalizeHost(host: string | null | undefined): string | null {
  if (!host) return null;
  const clean = host.split(':')[0]?.trim().toLowerCase();
  return clean || null;
}
