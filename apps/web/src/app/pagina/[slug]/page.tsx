import { Container, Title } from '@mantine/core';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { apiClient } from '../../../lib/api';
import { buildPageSeoMetadata } from '../../../lib/seo';
import type { StoreConfig } from '../../../providers/config-provider';

interface PageProps {
  params: Promise<{ slug: string }>;
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

export default async function StaticPage({ params }: PageProps) {
  const { slug } = await params;

  let page: {
    title: string;
    content: string;
  } | null = null;

  try {
    const { data } = await apiClient.GET('/pages/{slug}', {
      params: { path: { slug } },
    });
    if (!data) {
      notFound();
    }
    page = data;
  } catch {
    notFound();
  }

  return (
    <Container size="md" py="xl" style={{ minHeight: '60vh' }}>
      <Title order={1} mb="xl" style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        {page.title}
      </Title>
      <div
        className="nova-content"
        dangerouslySetInnerHTML={{ __html: page.content }}
        style={{ lineHeight: 1.7 }}
      />
    </Container>
  );
}
