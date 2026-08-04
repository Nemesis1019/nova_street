'use client';

import { Button, Group, Paper, Text } from '@mantine/core';
import Link from 'next/link';

import { useComparator } from '../hooks/use-comparator';
import { parseStorefrontConfig } from '../lib/storefront-config';
import { useStoreConfig } from '../providers/config-provider';

export function ComparatorBar() {
  const { items, clear } = useComparator();
  const config = useStoreConfig();
  const storefront = parseStorefrontConfig(config.storefrontConfig);

  if (!storefront.featureFlags.enableCompare || items.length === 0) return null;

  return (
    <Paper
      withBorder
      p="md"
      radius={0}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        backgroundColor: '#fcf9f8',
        borderTop: '1px solid #0d0d0d',
      }}
    >
      <Group justify="space-between" align="center" px={{ base: 16, md: 64 }}>
        <Text style={{ fontFamily: 'var(--font-bebas-neue)', fontSize: '18px' }}>
          {items.length} producto{items.length > 1 ? 's' : ''} seleccionado{items.length > 1 ? 's' : ''} para comparar
        </Text>
        <Group>
          <Button variant="subtle" color="dark" onClick={clear}>
            Limpiar
          </Button>
          <Link href={`/comparar?slugs=${items.join(',')}`} style={{ textDecoration: 'none' }}>
            <Button style={{ backgroundColor: '#0d0d0d', color: '#fcf9f8', fontFamily: 'var(--font-bebas-neue)' }}>
              Comparar
            </Button>
          </Link>
        </Group>
      </Group>
    </Paper>
  );
}
