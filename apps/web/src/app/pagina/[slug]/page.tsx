import type { components } from '@ecommerce/api-client';
import type { StorefrontDocument } from '@ecommerce/shared';
import { Container, Title } from '@mantine/core';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import type { CSSProperties } from 'react';

import { StoreFooter } from '../../../components/store-footer';
import { StoreHeader } from '../../../components/store-header';
import { StorefrontDocumentPage } from '../../../components/storefront/blocks';
import { apiClient } from '../../../lib/api';
import { buildPageSeoMetadata } from '../../../lib/seo';
import { applyStorefrontDocument, storefrontThemeVars } from '../../../lib/storefront-theme';
import { resolveTenantSlug } from '../../../lib/tenant';
import type { StoreConfig } from '../../../providers/config-provider';

interface PageProps {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

async function fetchPreviewDocument(token: string): Promise<StorefrontDocument | null> {
  try {
    const tenant = await resolveTenantSlug();
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const response = await fetch(
      `${baseUrl}/storefront/preview?token=${encodeURIComponent(token)}`,
      {
        headers: tenant ? { 'X-Tenant': tenant } : undefined,
        cache: 'no-store',
      },
    );
    if (!response.ok) return null;
    return (await response.json()) as StorefrontDocument;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const [{ data: page }, { data: config }] = await Promise.all([
      apiClient.GET('/pages/{slug}', { params: { path: { slug } } }),
      apiClient.GET('/store-config'),
    ]);
    if (!page) return {};
    return buildPageSeoMetadata(config as StoreConfig | undefined, page);
  } catch {
    return {};
  }
}

export default async function StaticPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const previewToken = typeof query.preview === 'string' ? query.preview : undefined;
  const reduceMotion = query.motion === 'reduce';

  let page: {
    title: string;
    content: string;
  } | null = null;
  let config: StoreConfig | null = null;
  let categories: components['schemas']['CategoryDto'][] = [];

  try {
    const [{ data: pageData }, { data: configData }, { data: categoriesData }] = await Promise.all([
      apiClient.GET('/pages/{slug}', { params: { path: { slug } } }),
      apiClient.GET('/store-config'),
      apiClient.GET('/catalog/categories'),
    ]);
    if (!pageData) notFound();
    page = pageData;
    config = (configData as StoreConfig) ?? null;
    categories = categoriesData ?? [];
  } catch {
    notFound();
  }

  if (!page) notFound();

  const previewDoc = previewToken ? await fetchPreviewDocument(previewToken) : null;
  const doc = previewDoc ?? config?.storefrontDoc;
  const customPage = doc?.pages.staticPages?.[slug];

  if (doc && customPage && customPage.sections.length > 0) {
    const activeConfig = previewDoc ? applyStorefrontDocument(config!, previewDoc) : config!;
    const content = (
      <StorefrontDocumentPage
        doc={doc}
        config={activeConfig}
        categories={categories}
        slug={slug}
        title={page.title}
      />
    );

    if (previewDoc) {
      return (
        <div
          className={reduceMotion ? 'sf-reduce-motion' : undefined}
          style={storefrontThemeVars(previewDoc.tokens, previewDoc.motion) as CSSProperties}
        >
          {content}
        </div>
      );
    }

    return content;
  }

  return (
    <>
      <StoreHeader />
      <main>
        <Container size="md" py="xl" style={{ minHeight: '60vh', paddingTop: 64, paddingBottom: 96 }}>
          <Title
            order={1}
            mb="xl"
            style={{ fontFamily: 'var(--sf-font-display, var(--font-bebas-neue))' }}
          >
            {page.title}
          </Title>
          <div
            className="nova-content"
            dangerouslySetInnerHTML={{ __html: page.content }}
            style={{ lineHeight: 1.7 }}
          />
        </Container>
      </main>
      <StoreFooter />
    </>
  );
}
