'use client';

import {
  Badge,
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
import { useRouter } from 'next/navigation';
import { useCallback, useState } from 'react';

type SortValue = 'newest' | 'price_asc' | 'price_desc' | 'name_asc';

interface CatalogFiltersProps {
  sizes: string[];
  colors: string[];
  categories: { slug: string; name: string }[];
  priceRanges: { label: string; min: number; max: number }[];
  initialCategory?: string;
  initialSizes?: string[];
  initialColors?: string[];
  initialMinPrice?: number;
  initialMaxPrice?: number;
  initialInStock?: boolean;
  initialSearch?: string;
  initialSort?: SortValue;
}

const SORT_OPTIONS: { value: SortValue; label: string }[] = [
  { value: 'newest', label: 'Más recientes' },
  { value: 'price_asc', label: 'Precio: menor a mayor' },
  { value: 'price_desc', label: 'Precio: mayor a menor' },
  { value: 'name_asc', label: 'Nombre A-Z' },
];

export function CatalogFilters({
  sizes,
  colors,
  categories,
  priceRanges,
  initialCategory,
  initialSizes,
  initialColors,
  initialMinPrice,
  initialMaxPrice,
  initialInStock,
  initialSearch,
  initialSort,
}: CatalogFiltersProps) {
  const router = useRouter();
  const isDesktop = useMediaQuery('(min-width: 62em)');
  const [opened, { open, close }] = useDisclosure(false);

  const [selectedCategory, setSelectedCategory] = useState<string | undefined>(initialCategory);
  const [selectedSizes, setSelectedSizes] = useState<string[]>(initialSizes ?? []);
  const [selectedColors, setSelectedColors] = useState<string[]>(initialColors ?? []);
  const [selectedRangeLabel, setSelectedRangeLabel] = useState<string | undefined>(() => {
    const match = priceRanges.find(
      (r) => r.min === initialMinPrice && (r.max === initialMaxPrice || (r.max === Infinity && initialMaxPrice === undefined)),
    );
    return match?.label;
  });
  const [inStock, setInStock] = useState<boolean>(initialInStock ?? false);
  const [search, setSearch] = useState<string>(initialSearch ?? '');
  const [sort, setSort] = useState<string | null>(initialSort ?? 'newest');

  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();

    if (selectedCategory) params.set('category', selectedCategory);
    selectedSizes.forEach((size) => params.append('sizes', size));
    selectedColors.forEach((color) => params.append('colors', color));

    const selectedRange = priceRanges.find((r) => r.label === selectedRangeLabel);
    if (selectedRange) {
      params.set('minPrice', String(selectedRange.min));
      if (selectedRange.max !== Infinity) params.set('maxPrice', String(selectedRange.max));
    }

    if (inStock) params.set('inStock', 'true');
    if (search.trim()) params.set('search', search.trim());
    if (sort && sort !== 'newest') params.set('sort', sort);

    return params.toString();
  }, [selectedCategory, selectedSizes, selectedColors, selectedRangeLabel, inStock, search, sort, priceRanges]);

  const applyFilters = useCallback(() => {
    const query = buildQueryString();
    router.push(`/catalogo${query ? `?${query}` : ''}`);
    close();
  }, [buildQueryString, router, close]);

  const clearAll = useCallback(() => {
    setSelectedCategory(undefined);
    setSelectedSizes([]);
    setSelectedColors([]);
    setSelectedRangeLabel(undefined);
    setInStock(false);
    setSearch('');
    setSort('newest');
    router.push('/catalogo');
    close();
  }, [router, close]);

  const toggleSize = (size: string) => {
    setSelectedSizes((prev) => (prev.includes(size) ? prev.filter((s) => s !== size) : [...prev, size]));
  };

  const toggleColor = (color: string) => {
    setSelectedColors((prev) => (prev.includes(color) ? prev.filter((c) => c !== color) : [...prev, color]));
  };

  const hasFilters =
    selectedCategory ||
    selectedSizes.length > 0 ||
    selectedColors.length > 0 ||
    selectedRangeLabel ||
    inStock ||
    search.trim() ||
    (sort && sort !== 'newest');

  const activeFiltersCount =
    (selectedCategory ? 1 : 0) +
    selectedSizes.length +
    selectedColors.length +
    (selectedRangeLabel ? 1 : 0) +
    (inStock ? 1 : 0) +
    (search.trim() ? 1 : 0);

  const filterContent = (
    <Stack gap="xl">
      <Group justify="space-between">
        <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
          Filtros
        </Title>
        {hasFilters && (
          <Button variant="subtle" size="xs" leftSection={<IconX size={14} />} onClick={clearAll}>
            Limpiar
          </Button>
        )}
      </Group>

      <Divider color="#0d0d0d" />

      <Stack gap="xs">
        <Text
          size="xs"
          style={{
            fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Buscar
        </Text>
        <TextInput
          placeholder="Nombre o descripción"
          value={search}
          onChange={(event) => setSearch(event.currentTarget.value)}
          styles={{
            input: {
              borderRadius: 0,
              borderColor: '#0d0d0d',
              backgroundColor: 'transparent',
            },
          }}
        />
      </Stack>

      <Divider color="rgba(13,13,13,0.1)" />

      <Stack gap="xs">
        <Text
          size="xs"
          style={{
            fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Ordenar
        </Text>
        <Select
          value={sort}
          onChange={setSort}
          data={SORT_OPTIONS}
          styles={{
            input: {
              borderRadius: 0,
              borderColor: '#0d0d0d',
              backgroundColor: 'transparent',
            },
            dropdown: {
              borderRadius: 0,
            },
          }}
        />
      </Stack>

      <Divider color="rgba(13,13,13,0.1)" />

      {categories.length > 0 && (
        <>
          <Stack gap="xs">
            <Text
              size="xs"
              style={{
                fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Categoría
            </Text>
            <Select
              placeholder="Todas"
              value={selectedCategory ?? null}
              onChange={(value) => setSelectedCategory(value ?? undefined)}
              data={categories.map((category) => ({ value: category.slug, label: category.name }))}
              clearable
              styles={{
                input: {
                  borderRadius: 0,
                  borderColor: '#0d0d0d',
                  backgroundColor: 'transparent',
                },
                dropdown: {
                  borderRadius: 0,
                },
              }}
            />
          </Stack>
          <Divider color="rgba(13,13,13,0.1)" />
        </>
      )}

      <Stack gap="xs">
        <Text
          size="xs"
          style={{
            fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Talla / Size
        </Text>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} role="group" aria-label="Tallas">
          {sizes.map((size) => {
            const selected = selectedSizes.includes(size);
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
        <Text
          size="xs"
          style={{
            fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Color
        </Text>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }} role="group" aria-label="Colores">
          {colors.map((color) => {
            const selected = selectedColors.includes(color);
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
        <Text
          size="xs"
          style={{
            fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
          }}
        >
          Rango de Precio
        </Text>
        <Stack gap="xs">
          {priceRanges.map((range) => (
            <Checkbox
              key={range.label}
              label={range.label}
              checked={selectedRangeLabel === range.label}
              onChange={() => setSelectedRangeLabel(selectedRangeLabel === range.label ? undefined : range.label)}
              styles={{
                input: {
                  borderRadius: 0,
                  borderColor: '#0d0d0d',
                },
              }}
            />
          ))}
        </Stack>
      </Stack>

      <Divider color="rgba(13,13,13,0.1)" />

      <Checkbox
        label="Solo productos en stock"
        checked={inStock}
        onChange={(event) => setInStock(event.currentTarget.checked)}
        styles={{
          input: {
            borderRadius: 0,
            borderColor: '#0d0d0d',
          },
        }}
      />

      <Button
        fullWidth
        onClick={applyFilters}
        style={{
          backgroundColor: '#0d0d0d',
          color: '#fcf9f8',
          fontFamily: 'var(--font-bebas-neue)',
        }}
      >
        Aplicar filtros
      </Button>

      {hasFilters && (
        <>
          <Divider color="#0d0d0d" />
          <Stack gap="xs">
            <Text
              size="xs"
              style={{
                fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Filtros activos
            </Text>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {selectedCategory && (
                <Badge variant="filled" color="dark" radius={0}>
                  Categoría: {categories.find((c) => c.slug === selectedCategory)?.name ?? selectedCategory}
                </Badge>
              )}
              {selectedSizes.map((size) => (
                <Badge key={size} variant="filled" color="dark" radius={0}>
                  Talla: {size}
                </Badge>
              ))}
              {selectedColors.map((color) => (
                <Badge key={color} variant="filled" color="dark" radius={0}>
                  Color: {color}
                </Badge>
              ))}
              {selectedRangeLabel && (
                <Badge variant="filled" color="dark" radius={0}>
                  {selectedRangeLabel}
                </Badge>
              )}
              {inStock && (
                <Badge variant="filled" color="dark" radius={0}>
                  En stock
                </Badge>
              )}
              {search.trim() && (
                <Badge variant="filled" color="dark" radius={0}>
                  Buscar: {search.trim()}
                </Badge>
              )}
            </div>
          </Stack>
        </>
      )}
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
        Filtros {activeFiltersCount > 0 && `(${activeFiltersCount})`}
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
        {filterContent}
      </Drawer>
    </>
  );
}
