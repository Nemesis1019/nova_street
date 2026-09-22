import createClient, { Middleware } from 'openapi-fetch';

import { paths } from './api-types';

export type ApiClient = ReturnType<typeof createApiClient>;

export interface ApiClientOptions {
  baseUrl: string;
  token?: string;
  getRefreshToken?: () => string | null | undefined;
  /** @deprecated refresh tokens are now sent in HTTP-only cookies; this is kept for compatibility */
  onTokenRefreshed?: (accessToken: string, refreshToken?: string) => void;
  onRefreshFailed?: () => void;
}

export function createApiClient(options: ApiClientOptions) {
  const client = createClient<paths>({ baseUrl: options.baseUrl });

  const authMiddleware: Middleware = {
    onRequest({ request }) {
      const token = options.token ?? undefined;
      if (token) {
        request.headers.set('Authorization', `Bearer ${token}`);
      }
      return request;
    },
  };

  let refreshPromise: Promise<string | null> | null = null;

  const refreshMiddleware: Middleware = {
    async onResponse({ request, response }) {
      if (response.status !== 401) {
        return response;
      }

      const requestUrl = new URL(request.url);
      if (requestUrl.pathname.endsWith('/auth/refresh')) {
        return response;
      }

      if (!refreshPromise) {
        refreshPromise = (async () => {
          try {
            const refreshResponse = await fetch(`${options.baseUrl}/auth/refresh`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
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
