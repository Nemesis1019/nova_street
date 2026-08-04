'use client';

import type { components } from '@ecommerce/api-client';
import { Container, Grid, GridCol, Image, Stack, Table, Text, Title } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';

import { ErrorState } from '../../components/error-state';
import { LoadingState } from '../../components/loading-state';
import { StoreFooter } from '../../components/store-footer';
import { StoreHeader } from '../../components/store-header';
import { apiClient } from '../../lib/api';

type ProductDetailDto = components['schemas']['ProductDetailDto'];
type ProductVariantDto = components['schemas']['ProductVariantDto'];

export default function ComparePage() {
  return (
    <Suspense fallback={<LoadingState />}>
      <ComparePageContent />
    </Suspense>
  );
}

function ComparePageContent() {
  const params = useSearchParams();
  const slugs = params.get('slugs')?.split(',').filter(Boolean) ?? [];

  const { data: products, isLoading, error, refetch } = useQuery<ProductDetailDto[]>({
    queryKey: ['compare-products', slugs],
    queryFn: async () => {
      const results = await Promise.all(
        slugs.map((slug) => apiClient.GET('/catalog/products/{slug}', { params: { path: { slug } } })),
      );
      return results.map((r) => r.data).filter((p): p is ProductDetailDto => !!p);
    },
    enabled: slugs.length > 0,
  });

  return (
    <>
      <StoreHeader />
      <main style={{ backgroundColor: '#fcf9f8', padding: '64px 16px 160px' }}>
        <Container size="xl" px={0}>
          <Title order={1} mb="xl" style={{ fontFamily: 'var(--font-bebas-neue)' }}>
            Comparar productos
          </Title>

          {slugs.length === 0 ? (
            <Text>Seleccioná productos desde el catálogo para comparar.</Text>
          ) : isLoading ? (
            <LoadingState />
          ) : error ? (
            <ErrorState title="No se pudieron cargar los productos" reset={refetch} />
          ) : (
            <>
              <Grid mb="xl">
                {products?.map((p) => (
                  <GridCol key={p.id} span={{ base: 12, md: 4 }}>
                    <Stack>
                      {p.images?.[0]?.url && (
                        <Image src={p.images[0].url} alt={p.name} fit="cover" height={200} radius={0} />
                      )}
                      <Title order={3} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
                        {p.name}
                      </Title>
                      <Text style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                        ${p.displayPrice.toLocaleString()}
                      </Text>
                    </Stack>
                  </GridCol>
                ))}
              </Grid>

              <Table withTableBorder>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Característica</Table.Th>
                    {products?.map((p) => (
                      <Table.Th key={p.id}>{p.name}</Table.Th>
                    ))}
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  <Table.Tr>
                    <Table.Td>Precio</Table.Td>
                    {products?.map((p) => (
                      <Table.Td key={p.id}>${p.displayPrice.toLocaleString()}</Table.Td>
                    ))}
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>Rating</Table.Td>
                    {products?.map((p) => (
                      <Table.Td key={p.id}>
                        {p.averageRating ? `${p.averageRating.toFixed(1)} (${p.reviewCount})` : 'Sin reviews'}
                      </Table.Td>
                    ))}
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>Variantes</Table.Td>
                    {products?.map((p) => (
                      <Table.Td key={p.id}>
                        {p.variants
                          ?.map((v: ProductVariantDto) => [v.size, v.color].filter(Boolean).join('/'))
                          .join(', ')}
                      </Table.Td>
                    ))}
                  </Table.Tr>
                  <Table.Tr>
                    <Table.Td>Descripción</Table.Td>
                    {products?.map((p) => (
                      <Table.Td key={p.id}>{p.description || '—'}</Table.Td>
                    ))}
                  </Table.Tr>
                </Table.Tbody>
              </Table>
            </>
          )}
        </Container>
      </main>
      <StoreFooter />
    </>
  );
}
