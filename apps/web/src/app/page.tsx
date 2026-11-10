import type { components } from '@ecommerce/api-client';
import type { StorefrontDocument } from '@ecommerce/shared';
import { headers } from 'next/headers';
import type { CSSProperties } from 'react';

import { StorefrontDocumentHome } from '../components/storefront/blocks';
import { ExperimentTracker } from '../components/storefront/experiment-tracker';
import { StorefrontHome } from '../components/templates/storefront-home';
import { apiClient } from '../lib/api';
import {
  applyExperimentToDocument,
  assignExperimentVariant,
  getActiveExperiment,
} from '../lib/storefront-experiment';
import { storefrontMotionVars } from '../lib/storefront-motion';
import { applyStorefrontDocument, storefrontThemeVars } from '../lib/storefront-theme';
import { resolveTenantSlug } from '../lib/tenant';
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

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const previewToken = typeof params.preview === 'string' ? params.preview : undefined;
  const reduceMotion = params.motion === 'reduce';

  let config: StoreConfig | null = null;
  let products: components['schemas']['ProductListResponseDto']['data'] = [];
  let categories: components['schemas']['CategoryDto'][] = [];
  let previewDoc: StorefrontDocument | null = null;

  try {
    const [{ data: configData }, { data: productsResponse }, { data: categoriesResponse }] =
      await Promise.all([
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

  if (previewToken) {
    previewDoc = await fetchPreviewDocument(previewToken);
  }

  const publishedDoc = (config as StoreConfig | null)?.storefrontDoc ?? null;
  const doc = previewDoc ?? publishedDoc;
  let renderDoc = doc;
  let experimentAssignment:
    | { experimentId: string; variant: ReturnType<typeof assignExperimentVariant> }
    | null = null;

  if (doc && !previewDoc) {
    const experiment = getActiveExperiment(doc);
    if (experiment) {
      const requestHeaders = await headers();
      const visitorId = requestHeaders.get('x-nova-visitor') ?? 'anonymous';
      const variant = assignExperimentVariant(experiment, visitorId);
      renderDoc = applyExperimentToDocument(doc, experiment, variant);
      experimentAssignment = { experimentId: experiment.id, variant };
    }
  }

  const activeConfig = applyStorefrontDocument(config ?? fallbackConfig, renderDoc);

  if (renderDoc) {
    const previewVars = previewDoc
      ? (storefrontThemeVars(previewDoc.tokens, previewDoc.motion) as CSSProperties)
      : (storefrontMotionVars(renderDoc.motion) as CSSProperties);
    return (
      <div className={reduceMotion ? 'sf-reduce-motion' : undefined} style={previewVars}>
        <StorefrontDocumentHome doc={renderDoc} config={activeConfig} categories={categories} />
        {experimentAssignment ? (
          <ExperimentTracker
            experimentId={experimentAssignment.experimentId}
            variant={experimentAssignment.variant}
          />
        ) : null}
      </div>
    );
  }

  const template = activeConfig.template ?? 'storefront';
  switch (template as TemplateName) {
    default:
      return <StorefrontHome config={activeConfig} products={products} categories={categories} />;
  }
}
