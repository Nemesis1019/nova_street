import type { components } from '@ecommerce/api-client';

import { parseStorefrontConfig } from '../../lib/storefront-config';
import type { StoreConfig } from '../../providers/config-provider';
import { type HomeSection,HomeSectionRenderer } from '../home-sections';
import { Marquee } from '../marquee';
import { StoreFooter } from '../store-footer';
import { StoreHeader } from '../store-header';

interface StorefrontHomeProps {
  config: StoreConfig;
  products: components['schemas']['ProductListResponseDto']['data'];
  categories: components['schemas']['CategoryDto'][];
}

export function StorefrontHome({ config, products, categories }: StorefrontHomeProps) {
  const storefront = parseStorefrontConfig(config.storefrontConfig);
  const sections = storefront.homeSections as HomeSection[];

  return (
    <>
      <StoreHeader />
      <main>
        {sections.map((section, index) => (
          <HomeSectionRenderer
            key={`${section}-${index}`}
            section={section}
            config={config}
            products={products}
            categories={categories}
          />
        ))}
        {sections.length === 0 && (
          <div style={{ padding: 128, textAlign: 'center' }}>
            No hay secciones configuradas para el home.
          </div>
        )}
        <Marquee />
      </main>
      <StoreFooter />
    </>
  );
}
