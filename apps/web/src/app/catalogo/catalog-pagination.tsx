'use client';

import { Group, Pagination, Select } from '@mantine/core';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

const LIMIT_OPTIONS = [
  { value: '12', label: '12 por página' },
  { value: '24', label: '24 por página' },
  { value: '48', label: '48 por página' },
];

interface CatalogPaginationProps {
  page: number;
  limit: number;
  total: number;
}

export function CatalogPagination({ page, limit, total }: CatalogPaginationProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const totalPages = Math.ceil(total / limit);

  const buildUrl = (nextPage: number, nextLimit: number) => {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPage === 1) {
      params.delete('page');
    } else {
      params.set('page', String(nextPage));
    }
    if (nextLimit === 24) {
      params.delete('limit');
    } else {
      params.set('limit', String(nextLimit));
    }
    const query = params.toString();
    return `${pathname}${query ? `?${query}` : ''}`;
  };

  return (
    <Group mt="xl" justify="space-between">
      <Pagination
        total={totalPages}
        value={page}
        onChange={(nextPage) => router.push(buildUrl(nextPage, limit))}
        color="dark"
        radius={0}
        siblings={1}
        boundaries={1}
        withEdges
        styles={{
          control: {
            borderColor: '#0d0d0d',
            backgroundColor: 'transparent',
            color: '#0d0d0d',
            fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
          },
        }}
      />
      <Select
        value={String(limit)}
        onChange={(value) => {
          if (value) {
            router.push(buildUrl(1, Number(value)));
          }
        }}
        data={LIMIT_OPTIONS}
        styles={{
          input: {
            borderRadius: 0,
            borderColor: '#0d0d0d',
            backgroundColor: 'transparent',
            fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
          },
          dropdown: {
            borderRadius: 0,
          },
        }}
        aria-label="Productos por página"
      />
    </Group>
  );
}
