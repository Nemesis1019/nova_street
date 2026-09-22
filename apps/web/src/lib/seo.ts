import type { Metadata } from 'next';

import type { StoreConfig } from '../providers/config-provider';
import { parseStorefrontConfig } from './storefront-config';

type TemplateType = 'default' | 'product' | 'category' | 'page';

interface SeoOptions {
  title?: string;
  description?: string;
  imageUrl?: string;
  template?: TemplateType;
}

function applyTemplate(template: string, variables: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => variables[key] ?? '');
}

export function buildSeoMetadata(
  config: StoreConfig | null | undefined,
  options: SeoOptions = {},
): Metadata {
  const storefront = parseStorefrontConfig(config?.storefrontConfig);
  const seo = storefront.seo;
  const storeName = config?.name ?? 'NÖVA';

  const templateKey = options.template === 'product'
    ? seo.productTitleTemplate
    : options.template === 'category'
      ? seo.categoryTitleTemplate
      : options.template === 'page'
        ? seo.pageTitleTemplate
        : seo.defaultTitleTemplate;

  const title = options.title
    ? applyTemplate(templateKey, { title: options.title, storeName })
    : storeName;

  const description = options.description || seo.defaultDescription || config?.description || '';
  const image = options.imageUrl || seo.ogImageUrl || config?.logoUrl || undefined;

  return {
    title,
    description: description || undefined,
    openGraph: {
      title,
      description: description || undefined,
      images: image ? [{ url: image }] : undefined,
    },
  };
}

export function buildProductSeoMetadata(
  config: StoreConfig | null | undefined,
  product: { name: string; metaTitle?: string | null; metaDescription?: string | null; images?: { url?: string }[] },
): Metadata {
  const storefront = parseStorefrontConfig(config?.storefrontConfig);
  const seo = storefront.seo;
  const title = product.metaTitle || applyTemplate(seo.productTitleTemplate, {
    productName: product.name,
    storeName: config?.name ?? 'NÖVA',
  });
  const description = product.metaDescription || seo.defaultDescription || config?.description || '';
  const image = product.images?.[0]?.url || seo.ogImageUrl || config?.logoUrl || undefined;

  return {
    title,
    description: description || undefined,
    openGraph: { title, description: description || undefined, images: image ? [{ url: image }] : undefined },
  };
}

export function buildCategorySeoMetadata(
  config: StoreConfig | null | undefined,
  category: { name: string; metaTitle?: string | null; metaDescription?: string | null },
): Metadata {
  const storefront = parseStorefrontConfig(config?.storefrontConfig);
  const seo = storefront.seo;
  const title = category.metaTitle || applyTemplate(seo.categoryTitleTemplate, {
    categoryName: category.name,
    storeName: config?.name ?? 'NÖVA',
  });
  const description = category.metaDescription || seo.defaultDescription || `Productos de ${category.name}`;

  return {
    title,
    description: description || undefined,
    openGraph: {
      title,
      description: description || undefined,
      images: seo.ogImageUrl || config?.logoUrl ? [{ url: seo.ogImageUrl || config?.logoUrl || '' }] : undefined,
    },
  };
}

export function buildPageSeoMetadata(
  config: StoreConfig | null | undefined,
  page: { title: string; metaTitle?: string | null; metaDescription?: string | null },
): Metadata {
  const storefront = parseStorefrontConfig(config?.storefrontConfig);
  const seo = storefront.seo;
  const title = page.metaTitle || applyTemplate(seo.pageTitleTemplate, {
    pageTitle: page.title,
    storeName: config?.name ?? 'NÖVA',
  });
  const description = page.metaDescription || seo.defaultDescription || '';

  return {
    title,
    description: description || undefined,
    openGraph: {
      title,
      description: description || undefined,
      images: seo.ogImageUrl || config?.logoUrl ? [{ url: seo.ogImageUrl || config?.logoUrl || '' }] : undefined,
    },
  };
}
