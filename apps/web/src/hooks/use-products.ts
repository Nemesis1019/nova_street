import { useQuery } from '@tanstack/react-query';

import { apiClient } from '../lib/api';

export function useProductsQuery(categorySlug?: string) {
  return useQuery({
    queryKey: ['products', categorySlug],
    queryFn: async () => {
      const { data } = await apiClient.GET('/catalog/products', {
        params: { query: { categorySlug, limit: 24 } },
      });
      return data;
    },
  });
}

export function useProductQuery(slug: string) {
  return useQuery({
    queryKey: ['product', slug],
    queryFn: async () => {
      const { data } = await apiClient.GET('/catalog/products/{slug}', {
        params: { path: { slug } },
      });
      return data;
    },
    enabled: Boolean(slug),
  });
}
