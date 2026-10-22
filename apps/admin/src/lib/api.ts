import { createApiClient } from '@ecommerce/api-client';
import type { Middleware } from 'openapi-fetch';

import { clearTokens, setAccessToken } from './auth';
import { getAdminTenantSlug } from './tenant';

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/** Access token en memoria (nunca en storage). */
let authToken: string | undefined;

export function setAuthToken(token: string | undefined) {
  authToken = token;
}

export function getAuthToken(): string | undefined {
  return authToken;
}

/**
 * Refresco del token de plataforma (registrado por `platform-auth` para no
 * crear un ciclo de imports). Si devuelve null se cae al refresh del tenant.
 */
let platformRefreshHandler: (() => Promise<string | null>) | undefined;

export function setPlatformRefreshHandler(handler: () => Promise<string | null>): void {
  platformRefreshHandler = handler;
}

/**
 * Restaura la sesión al cargar la app: pide un access token nuevo usando la
 * cookie httpOnly de refresh. Devuelve el token (en memoria) o null.
 */
export async function restoreSession(): Promise<string | null> {
  try {
    const tenant = getAdminTenantSlug();
    const response = await fetch(`${baseUrl}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'X-Client': 'admin', ...(tenant ? { 'X-Tenant': tenant } : {}) },
    });
    if (!response.ok) return null;
    const data = (await response.json()) as { accessToken?: string };
    if (!data.accessToken) return null;
    setAccessToken(data.accessToken);
    authToken = data.accessToken;
    return data.accessToken;
  } catch {
    return null;
  }
}

export const apiClient = createApiClient({
  baseUrl,
  clientId: 'admin',
  onTokenRefreshed: (accessToken) => {
    setAccessToken(accessToken);
    authToken = accessToken;
  },
  onRefreshFailed: () => {
    clearTokens();
    authToken = undefined;
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
  },
  refreshAccessToken: async () => {
    if (platformRefreshHandler) {
      const platformToken = await platformRefreshHandler();
      if (platformToken) return platformToken;
    }
    return restoreSession();
  },
});

const STORAGE_KEY = 'nova-admin-locale';

function getLocale(): string {
  if (typeof window === 'undefined') return 'es';
  return window.localStorage.getItem(STORAGE_KEY) || 'es';
}

const authMiddleware: Middleware = {
  onRequest({ request }) {
    if (authToken) {
      request.headers.set('Authorization', `Bearer ${authToken}`);
    }
    request.headers.set('Accept-Language', getLocale());
    const tenant = getAdminTenantSlug();
    if (tenant) {
      request.headers.set('X-Tenant', tenant);
    }
    return new Request(request, { credentials: 'include' });
  },
};

apiClient.use(authMiddleware);
