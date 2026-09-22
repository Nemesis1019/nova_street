import { createApiClient } from '@ecommerce/api-client';
import type { Middleware } from 'openapi-fetch';

import { useAuthStore } from '../store/auth-store';

const STORAGE_KEY = 'nova-locale';

function getLocale(): string {
  if (typeof window === 'undefined') return 'es';
  return window.localStorage.getItem(STORAGE_KEY) || 'es';
}

const dynamicAuthMiddleware: Middleware = {
  onRequest({ request }) {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      request.headers.set('Authorization', `Bearer ${accessToken}`);
    }
    request.headers.set('Accept-Language', getLocale());
    return new Request(request, { credentials: 'include' });
  },
};

export const apiClient = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
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
