'use client';

import { useQueryClient } from '@tanstack/react-query';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { setAuthToken } from '../lib/api';
import {
  loginPlatform,
  logoutPlatform,
  platformRequest,
  type PlatformUser,
  restorePlatformSession,
  verifyPlatformTwoFactor,
} from '../lib/platform-auth';
import { setAdminTenantSlug, setPlatformMode } from '../lib/tenant';

interface TenantOption {
  id: string;
  slug: string;
  name: string;
}

interface PlatformContextValue {
  user: PlatformUser | null;
  ready: boolean;
  login: (
    email: string,
    password: string,
    code?: string,
  ) => Promise<{ twoFactorRequired?: boolean; challengeToken?: string; user?: PlatformUser | null }>;
  verifyTwoFactor: (challengeToken: string, code: string) => Promise<PlatformUser | null>;
  logout: () => Promise<void>;
  /**
   * Cambia el cliente activo sin impersonar: el token de plataforma sigue
   * siendo la identidad y el backend resuelve el tenant por X-Tenant.
   */
  switchTenant: (tenant: TenantOption) => Promise<void>;
}

const PlatformContext = createContext<PlatformContextValue | null>(null);

export function PlatformProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<PlatformUser | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    void restorePlatformSession()
      .then((restored) => {
        if (mounted && restored) setUser(restored);
      })
      .finally(() => {
        if (mounted) setReady(true);
      });
    return () => {
      mounted = false;
    };
  }, []);

  const login = useCallback(
    async (email: string, password: string, code?: string) => {
      const result = await loginPlatform(email, password, code);
      if (result.user) {
        setUser(result.user);
        await queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
      }
      return result;
    },
    [queryClient],
  );

  const verifyTwoFactor = useCallback(
    async (challengeToken: string, code: string) => {
      const nextUser = await verifyPlatformTwoFactor(challengeToken, code);
      if (nextUser) {
        setUser(nextUser);
        await queryClient.invalidateQueries({ queryKey: ['platform', 'tenants'] });
      }
      return nextUser;
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    await logoutPlatform();
    setUser(null);
    await queryClient.invalidateQueries({ queryKey: ['platform'] });
  }, [queryClient]);

  const switchTenant = useCallback(async (tenant: TenantOption) => {
    // Audita el cambio y valida que el cliente exista/no esté suspendido.
    await platformRequest(`/platform/tenants/${tenant.id}/select`, { method: 'POST' });

    setAdminTenantSlug(tenant.slug);
    setPlatformMode(false);
    // El token de plataforma se conserva; solo cambia el X-Tenant.
    window.location.href = '/dashboard';
  }, []);

  const value = useMemo<PlatformContextValue>(
    () => ({
      user,
      ready,
      login,
      verifyTwoFactor,
      logout,
      switchTenant,
    }),
    [user, ready, login, verifyTwoFactor, logout, switchTenant],
  );

  // setAuthToken queda importado para el caso de restaurar sesión en caliente.
  void setAuthToken;

  return <PlatformContext.Provider value={value}>{children}</PlatformContext.Provider>;
}

export function usePlatformSession(): PlatformContextValue {
  const context = useContext(PlatformContext);
  if (!context) {
    throw new Error('usePlatformSession must be used within PlatformProvider');
  }
  return context;
}
