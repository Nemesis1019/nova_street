import { Container, Title } from '@mantine/core';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { apiClient } from '../../../lib/api';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  try {
    const { data } = await apiClient.GET('/pages/{slug}', {
      params: { path: { slug } },
    });
    if (!data) return {};
    return {
      title: data.metaTitle || data.title,
      description: data.metaDescription,
    };
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
