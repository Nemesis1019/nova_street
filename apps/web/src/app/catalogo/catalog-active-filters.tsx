'use client';

import { Group } from '@mantine/core';
import { IconX } from '@tabler/icons-react';
import type { CSSProperties } from 'react';

import { useCatalogFilters } from './catalog-filters-context';

const CHIP_STYLE: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  padding: '5px 8px 5px 10px',
  backgroundColor: '#0d0d0d',
  color: '#fcf9f8',
  border: '1px solid #0d0d0d',
  fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
  fontSize: 11,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};

function FilterChip({ label, onRemove }: { label: string; onRemove: () => void }) {
  return (
    <button type="button" style={CHIP_STYLE} onClick={onRemove} title="Quitar filtro" aria-label={`Quitar filtro ${label}`}>
      {label}
      <IconX size={12} stroke={2} aria-hidden="true" />
    </button>
  );
}

/** Chips de los filtros aplicados (arriba del panel de filtros). */
export function CatalogActiveFilters() {
  const { values, categories, hasFilters, setCategory, toggleSize, toggleColor, setRange, setInStock, setSearch } =
    useCatalogFilters();

  if (!hasFilters) return null;

  const categoryName = categories.find((category) => category.slug === values.category)?.name ?? values.category;

  return (
    <Group gap={8} wrap="wrap" align="center" role="status" aria-label="Filtros aplicados">
      {values.category && (
        <FilterChip label={`Categoría: ${categoryName}`} onRemove={() => setCategory(undefined)} />
      )}
      {values.sizes.map((size) => (
        <FilterChip key={`size-${size}`} label={`Talla: ${size}`} onRemove={() => toggleSize(size)} />
      ))}
      {values.colors.map((color) => (
        <FilterChip key={`color-${color}`} label={`Color: ${color}`} onRemove={() => toggleColor(color)} />
      ))}
      {values.rangeLabel && <FilterChip label={values.rangeLabel} onRemove={() => setRange(undefined)} />}
      {values.inStock && <FilterChip label="En stock" onRemove={() => setInStock(false)} />}
      {values.search.trim() && (
        <FilterChip label={`Buscar: ${values.search.trim()}`} onRemove={() => setSearch('')} />
      )}
    </Group>
  );
}
