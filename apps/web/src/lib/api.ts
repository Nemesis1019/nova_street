import { createApiClient } from '@ecommerce/api-client';
import type { Middleware } from 'openapi-fetch';

import { useAuthStore } from '../store/auth-store';
import { resolveTenantSlug } from './tenant';

const STORAGE_KEY = 'nova-locale';

function getLocale(): string {
  if (typeof window === 'undefined') return 'es';
  return window.localStorage.getItem(STORAGE_KEY) || 'es';
}

const dynamicAuthMiddleware: Middleware = {
  async onRequest({ request }) {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      request.headers.set('Authorization', `Bearer ${accessToken}`);
    }
    request.headers.set('Accept-Language', getLocale());

    // Identifica la tienda (subdominio) en TODAS las llamadas (cliente y SSR).
    const tenantSlug = await resolveTenantSlug();
    if (tenantSlug) {
      request.headers.set('X-Tenant', tenantSlug);
    }

    return new Request(request, { credentials: 'include' });
  },
};

export const apiClient = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  clientId: 'store',
  onTokenRefreshed: (accessToken) => {
    useAuthStore.getState().setAccessToken(accessToken);
  },
  onRefreshFailed: () => {
    useAuthStore.getState().logout();
  },
});

apiClient.use(dynamicAuthMiddleware);

export function getAccessToken(): string | null {
  if (typeof window === 'undefined') return null;
  return useAuthStore.getState().accessToken;
}

/**
 * Cierra la sesión: revoca el refresh token en el backend (limpia la cookie
 * httpOnly) y después limpia el estado local. Best effort si el backend falla.
 */
export async function logoutSession(): Promise<void> {
  const { accessToken } = useAuthStore.getState();
  try {
    const tenantSlug = await resolveTenantSlug();
    await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/auth/logout`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        'X-Client': 'store',
        ...(tenantSlug ? { 'X-Tenant': tenantSlug } : {}),
      },
    });
  } catch {
    // Aunque falle la revocación, cerramos la sesión local.
  }
  useAuthStore.getState().logout();
}
