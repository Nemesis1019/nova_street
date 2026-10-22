'use client';

import { Grid, GridCol } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';

import { apiClient } from '../lib/api';
import { useAuthStore } from '../store/auth-store';
import { EmptyState } from './empty-state';
import { ErrorState } from './error-state';
import { LoadingState } from './loading-state';
import { ProductCard } from './product-card';

/** Lista de favoritos reutilizable (página /wishlist y cuenta /account/wishlist). */
export function WishlistContent() {
  const { isAuthenticated, sessionReady } = useAuthStore();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['wishlist'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/wishlist');
      if (error) throw error;
      return data;
    },
    enabled: isAuthenticated,
  });

  const items = data?.data ?? [];

  if (!sessionReady) {
    return <LoadingState message="Cargando favoritos..." />;
  }

  if (!isAuthenticated) {
    return (
      <EmptyState
        title="Iniciá sesión"
        description="Para ver tu lista de favoritos necesitás iniciar sesión."
        action={{ label: 'Iniciar sesión', href: '/login' }}
      />
    );
  }

  if (isLoading) {
    return <LoadingState message="Cargando favoritos..." />;
  }

  if (error) {
    return <ErrorState title="No se pudieron cargar los favoritos" reset={refetch} />;
  }

  if (items.length === 0) {
    return (
      <EmptyState
        title="No tenés favoritos"
        description="Agregá productos a tu lista desde el catálogo."
        action={{ label: 'Ver catálogo', href: '/catalogo' }}
      />
    );
  }

  return (
    <Grid>
      {items.map((item) => (
        <GridCol key={item.id} span={{ base: 6, md: 3 }}>
          <ProductCard
            product={{
              id: item.productVariantId,
              name: item.productName,
              slug: item.productSlug,
              basePrice: item.price,
              displayPrice: item.price,
              images: item.imageUrl ? [{ url: item.imageUrl }] : [],
            }}
            isInWishlist
            isUnavailable={!item.isAvailable}
          />
        </GridCol>
      ))}
    </Grid>
  );
}
