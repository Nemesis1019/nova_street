import { render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useAuthStore } from '../store/auth-store';
import { AuthRehydrator } from './auth-rehydrator';

vi.mock('../lib/api', () => ({
  apiClient: {
    GET: vi.fn(async () => ({
      data: {
        email: 'customer@tienda.com',
        emailVerified: true,
        acceptedTermsVersion: '1',
      },
      error: null,
    })),
  },
}));

function resetStore() {
  useAuthStore.setState({
    accessToken: null,
    email: null,
    isAuthenticated: false,
    isHydrated: false,
    emailVerified: false,
    rememberMe: false,
    acceptedTermsVersion: null,
    sessionReady: false,
  });
}

describe('AuthRehydrator', () => {
  beforeEach(() => {
    resetStore();
    window.localStorage.clear();
  });

  it('restaura la sesión desde la cookie al recargar (sin "Recordarme")', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(JSON.stringify({ accessToken: 'access-token' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })),
    );

    render(
      <AuthRehydrator>
        <div />
      </AuthRehydrator>,
    );

    await waitFor(() => {
      expect(useAuthStore.getState().isAuthenticated).toBe(true);
    });
    expect(useAuthStore.getState().accessToken).toBe('access-token');
    expect(useAuthStore.getState().email).toBe('customer@tienda.com');
    expect(useAuthStore.getState().sessionReady).toBe(true);
  });

  it('queda como invitado cuando no hay cookie válida', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 401 })));

    render(
      <AuthRehydrator>
        <div />
      </AuthRehydrator>,
    );

    await waitFor(() => {
      expect(useAuthStore.getState().sessionReady).toBe(true);
    });
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
