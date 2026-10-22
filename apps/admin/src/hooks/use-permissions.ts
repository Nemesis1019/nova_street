'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '../lib/api';

interface MeResponse {
  id: string;
  email: string;
  role?: { name?: string; permissions?: string[] } | string;
  twoFactorEnabled?: boolean;
}

/**
 * Permisos efectivos del usuario autenticado (rol + overrides) desde /auth/me.
 * Usado para ocultar/deshabilitar secciones reservadas (ej. proveedores → Super Admin).
 */
export function useCurrentPermissions() {
  const { data, isLoading } = useQuery({
    queryKey: ['auth', 'me'],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/auth/me');
      if (error) throw error;
      return data as unknown as MeResponse;
    },
  });

  const role = typeof data?.role === 'object' ? data.role : undefined;
  const permissions = role?.permissions ?? [];

  return {
    permissions,
    roleName: role?.name,
    isLoading,
    has: (permission: string) => permissions.includes(permission),
  };
}
