'use client';

import { Container, Grid, GridCol, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';

import { EmptyState } from '../../components/empty-state';
import { ErrorState } from '../../components/error-state';
import { LoadingState } from '../../components/loading-state';
import { ProductCard } from '../../components/product-card';
import { StoreFooter } from '../../components/store-footer';
import { StoreHeader } from '../../components/store-header';
import { apiClient } from '../../lib/api';
import { useAuthStore } from '../../store/auth-store';

export default function WishlistPage() {
  const { isAuthenticated } = useAuthStore();

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

  return (
    <>
      <StoreHeader />
      <main style={{ backgroundColor: '#fcf9f8', padding: '64px 16px 128px' }}>
        <Container size="xl" px={0}>
          <Title order={1} mb="xl" style={{ fontFamily: 'var(--font-bebas-neue)' }}>
            Mis favoritos
          </Title>

          {!isAuthenticated ? (
            <EmptyState
              title="Iniciá sesión"
              description="Para ver tu lista de favoritos necesitás iniciar sesión."
              action={{ label: 'Iniciar sesión', href: '/login' }}
            />
          ) : isLoading ? (
            <LoadingState message="Cargando favoritos..." />
          ) : error ? (
            <ErrorState title="No se pudieron cargar los favoritos" reset={refetch} />
          ) : items.length === 0 ? (
            <EmptyState
              title="No tenés favoritos"
              description="Agregá productos a tu lista desde el catálogo."
              action={{ label: 'Ver catálogo', href: '/catalogo' }}
            />
          ) : (
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
                  />
                </GridCol>
              ))}
            </Grid>
          )}
        </Container>
      </main>
      <StoreFooter />
    </>
  );
}
