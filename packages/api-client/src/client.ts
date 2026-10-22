import createClient, { Middleware } from 'openapi-fetch';

import { paths } from './api-types';

export type ApiClient = ReturnType<typeof createApiClient>;

export interface ApiClientOptions {
  baseUrl: string;
  /**
   * Identifica la app que usa el cliente (`store` | `admin`). La API lo usa
   * para aislar las cookies de sesión entre storefront y admin (mismo host,
   * puertos distintos: las cookies no distinguen puertos).
   */
  clientId?: string;
  token?: string;
  onTokenRefreshed?: (accessToken: string) => void;
  onRefreshFailed?: () => void;
  /**
   * Refresco personalizado (p. ej. token de plataforma). Si no se define, se
   * usa `/auth/refresh` con la cookie del cliente.
   */
  refreshAccessToken?: () => Promise<string | null>;
}

export function createApiClient(options: ApiClientOptions) {
  const client = createClient<paths>({ baseUrl: options.baseUrl });

  const authMiddleware: Middleware = {
    onRequest({ request }) {
      const token = options.token ?? undefined;
      if (token) {
        request.headers.set('Authorization', `Bearer ${token}`);
      }
      if (options.clientId) {
        request.headers.set('X-Client', options.clientId);
      }
      return request;
    },
  };

  let refreshPromise: Promise<string | null> | null = null;

  // Endpoints públicos/de credenciales: un 401 es una respuesta de negocio
  // (credenciales inválidas, challenge vencido), no una sesión vencida. Si se
  // intentara refrescar, un login fallido podría "iniciar sesión" con la
  // cookie de una sesión anterior (p. ej. disparando el banner de verificación).
  const NO_REFRESH_PATHS = [
    '/auth/login',
    '/auth/register',
    '/auth/refresh',
    '/auth/verify-email',
    '/auth/forgot-password',
    '/auth/reset-password',
    '/auth/google',
    '/auth/apple',
    '/auth/2fa/verify',
    '/auth/2fa/setup',
    '/auth/2fa/setup/confirm',
  ];

  const refreshMiddleware: Middleware = {
    async onResponse({ request, response }) {
      if (response.status !== 401) {
        return response;
      }

      const requestUrl = new URL(request.url);
      if (NO_REFRESH_PATHS.some((path) => requestUrl.pathname.endsWith(path))) {
        return response;
      }

      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            if (options.refreshAccessToken) {
              const token = await options.refreshAccessToken();
              if (token) options.onTokenRefreshed?.(token);
              return token;
            }

            const refreshResponse = await fetch(`${options.baseUrl}/auth/refresh`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(options.clientId ? { 'X-Client': options.clientId } : {}),
              },
              credentials: 'include',
            });
            if (!refreshResponse.ok) return null;
            const data = (await refreshResponse.json()) as {
              accessToken: string;
            };
            options.onTokenRefreshed?.(data.accessToken);
            return data.accessToken;
          } catch {
            return null;
          } finally {
            refreshPromise = null;
          }
        })();
      }

      const newAccessToken = await refreshPromise;
      if (!newAccessToken) {
        options.onRefreshFailed?.();
        return response;
      }

      request.headers.set('Authorization', `Bearer ${newAccessToken}`);
      return fetch(request);
    },
  };

  client.use(authMiddleware);
  client.use(refreshMiddleware);

  return client;
}

export type { paths as ApiPaths, paths };
