import { createApiClient } from '@ecommerce/api-client';
import type { Middleware } from 'openapi-fetch';

import { clearTokens, getAccessToken, setAccessToken } from './auth';

let authToken: string | undefined = getAccessToken() ?? undefined;

export function setAuthToken(token: string | undefined) {
  authToken = token;
}

export function getAuthToken(): string | undefined {
  return authToken;
}

export const apiClient = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
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
    return new Request(request, { credentials: 'include' });
  },
};

apiClient.use(authMiddleware);
