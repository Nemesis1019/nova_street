'use client';

import { Anchor,Group, Loader, Modal, Stack, Text, TextInput } from '@mantine/core';
import { useDisclosure, useHotkeys } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { apiClient } from '../lib/api';

type SearchResults = {
  products: Array<{ id: string; title: string; url: string }>;
  orders: Array<{ id: string; title: string; url: string }>;
  users: Array<{ id: string; title: string; url: string }>;
  pages: Array<{ id: string; title: string; url: string }>;
};

export function CommandPalette() {
  const [opened, { open, close }] = useDisclosure(false);
  const [query, setQuery] = useState('');

  useHotkeys([
    ['mod+K', open],
    ['ctrl+K', open],
  ]);

  const { data, isFetching } = useQuery<SearchResults>({
    queryKey: ['admin-search', query],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/admin/search', {
        params: { query: { q: query } },
      });
      if (error) throw error;
      return data as SearchResults;
    },
    enabled: query.trim().length > 0,
  });

  const sections: Array<{ title: string; items: SearchResults[keyof SearchResults] }> = [
    { title: 'Productos', items: data?.products ?? [] },
    { title: 'Pedidos', items: data?.orders ?? [] },
    { title: 'Usuarios', items: data?.users ?? [] },
    { title: 'Páginas', items: data?.pages ?? [] },
  ];

  return (
    <>
      <TextInput
        placeholder="Buscar... (Ctrl + K)"
        onClick={open}
        readOnly
        style={{ cursor: 'pointer', minWidth: 200 }}
      />
      <Modal opened={opened} onClose={close} title="Búsqueda global" size="lg">
        <TextInput
          placeholder="Escribí para buscar productos, pedidos, usuarios o páginas"
          value={query}
          onChange={(event) => setQuery(event.currentTarget.value)}
          autoFocus
        />
        {isFetching && (
          <Group justify="center" mt="md">
            <Loader size="sm" />
          </Group>
        )}
        <Stack mt="md" gap="sm">
          {sections.map((section) =>
            section.items.length === 0 ? null : (
              <div key={section.title}>
                <Text size="sm" fw={700} c="dimmed" mb="xs">
                  {section.title}
                </Text>
                <Stack gap="xs">
                  {section.items.map((item) => (
                    <Anchor
                      key={item.id}
                      component={Link}
                      href={item.url}
                      onClick={close}
                      style={{ textDecoration: 'none' }}
                    >
                      <Text size="sm">{item.title}</Text>
                    </Anchor>
                  ))}
                </Stack>
              </div>
            ),
          )}
          {!isFetching && query.trim().length > 0 && sections.every((s) => s.items.length === 0) && (
            <Text c="dimmed" size="sm">
              No se encontraron resultados.
            </Text>
          )}
        </Stack>
      </Modal>
    </>
  );
}
