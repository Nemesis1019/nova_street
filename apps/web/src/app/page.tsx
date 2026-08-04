import type { components } from '@ecommerce/api-client';

import { StorefrontHome } from '../components/templates/storefront-home';
import { apiClient } from '../lib/api';
import type { StoreConfig, TemplateName } from '../providers/config-provider';

const fallbackConfig: StoreConfig = {
  id: 'default',
  name: 'Tienda',
  description: '',
  primaryColor: '#0d0d0d',
  secondaryColor: '#6f7a4e',
  backgroundColor: '#fcf9f8',
  textColor: '#1b1c1c',
  currencyCode: 'COP',
  template: 'storefront',
};

export default async function HomePage() {
  let config: StoreConfig | null = null;
  let products: components['schemas']['ProductListResponseDto']['data'] = [];
  let categories: components['schemas']['CategoryDto'][] = [];
  try {
    const [{ data: configData }, { data: productsResponse }, { data: categoriesResponse }] = await Promise.all([
      apiClient.GET('/store-config'),
      apiClient.GET('/catalog/products', { params: { query: { limit: 8 } } }),
      apiClient.GET('/catalog/categories'),
    ]);
    config = (configData as StoreConfig) ?? null;
    products = productsResponse?.data ?? [];
    categories = categoriesResponse ?? [];
  } catch {
    config = null;
    products = [];
    categories = [];
  }

  const activeConfig = config ?? fallbackConfig;
  const template = activeConfig.template ?? 'storefront';

  switch (template as TemplateName) {
    default:
      return <StorefrontHome config={activeConfig} products={products} categories={categories} />;
  }
}
