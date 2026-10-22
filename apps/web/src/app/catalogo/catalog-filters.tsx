'use client';

import {
  Button,
  Checkbox,
  Divider,
  Drawer,
  Group,
  Select,
  Stack,
  Text,
  TextInput,
  Title,
} from '@mantine/core';
import { useDisclosure, useMediaQuery } from '@mantine/hooks';
import { IconFilter, IconX } from '@tabler/icons-react';
import type { ReactNode } from 'react';

import { CatalogActiveFilters } from './catalog-active-filters';
import { type CatalogSortValue, useCatalogFilters } from './catalog-filters-context';

interface CatalogFiltersProps {
  sizes: string[];
  colors: string[];
}

const SORT_OPTIONS: { value: CatalogSortValue; label: string }[] = [
  { value: 'newest', label: 'Más recientes' },
  { value: 'price_asc', label: 'Precio: menor a mayor' },
  { value: 'price_desc', label: 'Precio: mayor a menor' },
  { value: 'name_asc', label: 'Nombre A-Z' },
];

const INPUT_STYLES = {
  input: {
    borderRadius: 0,
    borderColor: '#0d0d0d',
    backgroundColor: 'transparent',
  },
  dropdown: {
    borderRadius: 0,
  },
} as const;

const CHECKBOX_STYLES = {
  input: {
    borderRadius: 0,
    borderColor: '#0d0d0d',
  },
} as const;

function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <Text
      size="xs"
      style={{
        fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {children}
    </Text>
  );
}

export function CatalogFilters({ sizes, colors }: CatalogFiltersProps) {
  const isDesktop = useMediaQuery('(min-width: 62em)');
  const [opened, { open, close }] = useDisclosure(false);
  const {
    values,
    priceRanges,
    categories,
    hasFilters,
    activeCount,
    setCategory,
    toggleSize,
    toggleColor,
    setRange,
    setInStock,
    setSearch,
    setSort,
    clearAll,
  } = useCatalogFilters();

  const filterContent = (
    <Stack gap="xl">
      <Stack gap="sm">
        <Group justify="space-between">
          <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
            Filtros
          </Title>
          {hasFilters && (
            <Button
              variant="subtle"
              size="xs"
              leftSection={<IconX size={14} />}
              onClick={clearAll}
              styles={{
                root: {
                  padding: '4px 8px',
                  height: 'auto',
                  fontSize: '12px',
                  fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
                },
              }}
            >
              Limpiar
            </Button>
          )}
        </Group>

        <CatalogActiveFilters />
      </Stack>

      <Divider color="#0d0d0d" />

      <Stack gap="xs">
        <SectionLabel>Buscar</SectionLabel>
        <TextInput
          placeholder="Nombre o descripción"
          value={values.search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          styles={INPUT_STYLES}
        />
      </Stack>

      <Divider color="rgba(13,13,13,0.1)" />

      <Stack gap="xs">
        <SectionLabel>Ordenar</SectionLabel>
        <Select
          value={values.sort}
          onChange={(value) => setSort((value as CatalogSortValue) ?? 'newest')}
          data={SORT_OPTIONS}
          styles={INPUT_STYLES}
        />
      </Stack>

      <Divider color="rgba(13,13,13,0.1)" />

      {categories.length > 0 && (
        <>
          <Stack gap="xs">
            <SectionLabel>Categoría</SectionLabel>
            <Select
              placeholder="Todas"
              value={values.category ?? null}
              onChange={(value) => setCategory(value ?? undefined)}
              data={categories.map((category) => ({ value: category.slug, label: category.name }))}
              clearable
              styles={INPUT_STYLES}
            />
          </Stack>
          <Divider color="rgba(13,13,13,0.1)" />
        </>
      )}

      <Stack gap="xs">
        <SectionLabel>Talla / Size</SectionLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} role="group" aria-label="Tallas">
          {sizes.map((size) => {
            const selected = values.sizes.includes(size);
            return (
              <button
                key={size}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleSize(size)}
                style={{
                  width: 40,
                  height: 40,
                  border: '1px solid #0d0d0d',
                  backgroundColor: selected ? '#0d0d0d' : 'transparent',
                  color: selected ? '#fcf9f8' : '#0d0d0d',
                  fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                {size}
              </button>
            );
          })}
        </div>
      </Stack>

      <Divider color="rgba(13,13,13,0.1)" />

      <Stack gap="xs">
        <SectionLabel>Color</SectionLabel>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} role="group" aria-label="Colores">
          {colors.map((color) => {
            const selected = values.colors.includes(color);
            return (
              <button
                key={color}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleColor(color)}
                style={{
                  padding: '8px 12px',
                  border: '1px solid #0d0d0d',
                  backgroundColor: selected ? '#0d0d0d' : 'transparent',
                  color: selected ? '#fcf9f8' : '#0d0d0d',
                  fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
                  fontSize: '12px',
                  cursor: 'pointer',
                }}
              >
                {color}
              </button>
            );
          })}
        </div>
      </Stack>

      <Divider color="rgba(13,13,13,0.1)" />

      <Stack gap="xs">
        <SectionLabel>Rango de Precio</SectionLabel>
        <Stack gap="xs">
          {priceRanges.map((range) => (
            <Checkbox
              key={range.label}
              label={range.label}
              checked={values.rangeLabel === range.label}
              onChange={() => setRange(values.rangeLabel === range.label ? undefined : range.label)}
              styles={CHECKBOX_STYLES}
            />
          ))}
        </Stack>
      </Stack>

      <Divider color="rgba(13,13,13,0.1)" />

      <Checkbox
        label="Solo productos en stock"
        checked={values.inStock}
        onChange={(event) => setInStock(event.currentTarget.checked)}
        styles={CHECKBOX_STYLES}
      />
    </Stack>
  );

  if (isDesktop) {
    return filterContent;
  }

  return (
    <>
      <Button
        variant="outline"
        leftSection={<IconFilter size={18} />}
        onClick={open}
        fullWidth
        style={{ borderColor: '#0d0d0d', color: '#0d0d0d' }}
      >
        Filtros {activeCount > 0 && `(${activeCount})`}
      </Button>
      <Drawer
        opened={opened}
        onClose={close}
        title="Filtros"
        position="right"
        size="100%"
        styles={{
          content: {
            backgroundColor: '#fcf9f8',
            color: '#0d0d0d',
          },
          header: {
            borderBottom: '1px solid #0d0d0d',
          },
        }}
      >
        <Stack gap="xl">
          {filterContent}
          <Button
            fullWidth
            onClick={close}
            style={{
              backgroundColor: '#0d0d0d',
              color: '#fcf9f8',
              fontFamily: 'var(--font-bebas-neue)',
            }}
          >
            Ver resultados
          </Button>
        </Stack>
      </Drawer>
    </>
  );
}
