import { createApiClient } from '@ecommerce/api-client';
import type { Middleware } from 'openapi-fetch';

import { useAuthStore } from '../store/auth-store';

const dynamicAuthMiddleware: Middleware = {
  onRequest({ request }) {
    const { accessToken } = useAuthStore.getState();
    if (accessToken) {
      request.headers.set('Authorization', `Bearer ${accessToken}`);
    }
    return request;
  },
};

export const apiClient = createApiClient({
  baseUrl: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000',
  getRefreshToken: () => useAuthStore.getState().refreshToken,
  onTokenRefreshed: (accessToken, refreshToken) => {
    useAuthStore.getState().setTokens(accessToken, refreshToken);
  },
  onRefreshFailed: () => {
    useAuthStore.getState().logout();
  },
});

apiClient.use(dynamicAuthMiddleware);
