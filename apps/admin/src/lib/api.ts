import { createApiClient } from '@ecommerce/api-client';
import type { Middleware } from 'openapi-fetch';

import { clearTokens, getAccessToken, getRefreshToken } from './auth';

let authToken: string | undefined = getAccessToken() ?? undefined;

export function setAuthToken(token: string | undefined) {
  authToken = token;
}

export function getAuthToken(): string | undefined {
  return authToken;
}

export const apiClient = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  getRefreshToken,
  onTokenRefreshed: (accessToken, refreshToken) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('admin_access_token', accessToken);
      localStorage.setItem('admin_refresh_token', refreshToken);
    }
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

const authMiddleware: Middleware = {
  onRequest({ request }) {
    if (authToken) {
      request.headers.set('Authorization', `Bearer ${authToken}`);
    }
    return request;
  },
};

apiClient.use(authMiddleware);
