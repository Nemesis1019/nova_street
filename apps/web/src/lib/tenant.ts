import { hostToTenantSlug } from '@ecommerce/shared';

/**
 * Resuelve el slug del tenant para el request actual.
 * - En el navegador: a partir del hostname (`cliente.nova.app` → `cliente`).
 * - En el servidor (SSR): a partir del header `host` del request de Next.
 * Devuelve `undefined` para el dominio principal/localhost (el API usa el
 * tenant por defecto).
 */
export async function resolveTenantSlug(): Promise<string | undefined> {
  if (typeof window !== 'undefined') {
    return hostToTenantSlug(window.location.hostname) ?? undefined;
  }

  try {
    // Import dinámico: `next/headers` no debe entrar en el bundle del cliente.
    const { headers } = await import('next/headers');
    const requestHeaders = await headers();
    return hostToTenantSlug(requestHeaders.get('host')) ?? undefined;
  } catch {
    return undefined;
  }
}
