'use client';

import { useEffect, useRef } from 'react';

import { apiClient } from '../lib/api';
import { resolveTenantSlug } from '../lib/tenant';
import { useAuthStore } from '../store/auth-store';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

/**
 * Restaura la sesión al cargar la app:
 * 1. Rehidrata lo persistido en localStorage (caso "Recordarme").
 * 2. Si no hay sesión persistida, intenta recuperarla con la cookie httpOnly
 *    (`POST /auth/refresh`) — así un reload no cierra la sesión.
 */
export function AuthRehydrator({ children }: { children: React.ReactNode }) {
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;

    const restore = async () => {

      try {
        await useAuthStore.persist.rehydrate();

        if (!useAuthStore.getState().isAuthenticated) {
          const tenantSlug = await resolveTenantSlug();
          const response = await fetch(`${API_URL}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'X-Client': 'store', ...(tenantSlug ? { 'X-Tenant': tenantSlug } : {}) },
          });

          if (response.ok) {
            const data = (await response.json()) as { accessToken?: string };
            if (data.accessToken) {
              useAuthStore.getState().setAccessToken(data.accessToken);

              const { data: me } = await apiClient.GET('/auth/me');
              if (me) {
                useAuthStore.getState().setAuth(
                  data.accessToken,
                  me.email,
                  me.emailVerified,
                  useAuthStore.getState().rememberMe,
                  (me as { acceptedTermsVersion?: string | null }).acceptedTermsVersion ?? null,
                );
              }
            }
          }
        }
      } catch {
        // Sin sesión previa: seguimos como invitado.
      } finally {
        useAuthStore.getState().setSessionReady(true);
      }
    };

    void restore();
  }, []);

  return children;
}
