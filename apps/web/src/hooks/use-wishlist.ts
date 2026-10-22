'use client';

import { useQuery } from '@tanstack/react-query';

import { apiClient } from '../lib/api';
import { useAuthStore } from '../store/auth-store';

/**
 * IDs de variantes en la lista de favoritos del usuario (vacío si no hay sesión).
 * Comparte la query key `['wishlist']` con la página de favoritos, así que
 * agregar/quitar desde una card se refleja en todos lados.
 */
export function useWishlistVariantIds() {
  const { isAuthenticated } = useAuthStore();

  const { data } = useQuery({
    queryKey: ['wishlist'],
    enabled: isAuthenticated,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/wishlist');
      if (error) throw error;
      return data;
    },
  });

  const variantIds = new Set((data?.data ?? []).map((item) => item.productVariantId));

  return { variantIds, isAuthenticated };
}
