'use client';

import { useRouter } from 'next/navigation';
import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

export type CatalogSortValue = 'newest' | 'price_asc' | 'price_desc' | 'name_asc';

export interface CatalogPriceRange {
  label: string;
  min: number;
  max: number;
}

interface CatalogFilterValues {
  category?: string;
  sizes: string[];
  colors: string[];
  rangeLabel?: string;
  inStock: boolean;
  search: string;
  sort: CatalogSortValue;
}

interface CatalogFiltersContextValue {
  values: CatalogFilterValues;
  priceRanges: CatalogPriceRange[];
  categories: { slug: string; name: string }[];
  activeCount: number;
  hasFilters: boolean;
  setCategory: (category?: string) => void;
  toggleSize: (size: string) => void;
  toggleColor: (color: string) => void;
  setRange: (label?: string) => void;
  setInStock: (value: boolean) => void;
  setSearch: (value: string) => void;
  setSort: (value: CatalogSortValue) => void;
  clearAll: () => void;
}

interface CatalogFiltersProviderProps {
  categories: { slug: string; name: string }[];
  priceRanges: CatalogPriceRange[];
  initialCategory?: string;
  initialSizes?: string[];
  initialColors?: string[];
  initialMinPrice?: number;
  initialMaxPrice?: number;
  initialInStock?: boolean;
  initialSearch?: string;
  initialSort?: CatalogSortValue;
  children: ReactNode;
}

/**
 * La URL usa los mismos valores que la API (`price_asc`, `price_desc`,
 * `name_asc`); la página los reenvía tal cual al endpoint de productos.
 * La búsqueda se aplica con debounce; el resto de filtros, al instante.
 */
const SEARCH_DEBOUNCE_MS = 400;

/** Parámetros de la URL que gestiona el provider (el resto se preserva). */
const MANAGED_KEYS = [
  'category',
  'sizes',
  'colors',
  'minPrice',
  'maxPrice',
  'inStock',
  'search',
  'sort',
] as const;

function managedQueryFromUrl(urlSearch: string): string {
  const params = new URLSearchParams(urlSearch);
  const managed = new URLSearchParams();
  for (const key of MANAGED_KEYS) {
    for (const value of params.getAll(key)) {
      managed.append(key, value);
    }
  }
  return managed.toString();
}

function areValuesEqual(a: CatalogFilterValues, b: CatalogFilterValues): boolean {
  return (
    a.category === b.category &&
    a.rangeLabel === b.rangeLabel &&
    a.inStock === b.inStock &&
    a.search === b.search &&
    a.sort === b.sort &&
    a.sizes.length === b.sizes.length &&
    a.sizes.every((size, index) => size === b.sizes[index]) &&
    a.colors.length === b.colors.length &&
    a.colors.every((color, index) => color === b.colors[index])
  );
}

const CatalogFiltersContext = createContext<CatalogFiltersContextValue | null>(null);

export function CatalogFiltersProvider({
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
  children,
}: CatalogFiltersProviderProps) {
  const router = useRouter();

  // Valores derivados de la URL (props del server). Se usan como estado
  // inicial y para adoptar cambios externos (atrás/adelante, links).
  const urlValues = useMemo<CatalogFilterValues>(
    () => ({
      category: initialCategory,
      sizes: initialSizes ?? [],
      colors: initialColors ?? [],
      rangeLabel: priceRanges.find(
        (range) =>
          range.min === initialMinPrice &&
          (range.max === initialMaxPrice || (range.max === Infinity && initialMaxPrice === undefined)),
      )?.label,
      inStock: initialInStock ?? false,
      search: initialSearch ?? '',
      sort: initialSort ?? 'newest',
    }),
    [
      initialCategory,
      initialSizes,
      initialColors,
      initialMinPrice,
      initialMaxPrice,
      initialInStock,
      initialSearch,
      initialSort,
      priceRanges,
    ],
  );

  const [values, setValues] = useState<CatalogFilterValues>(urlValues);
  const [debouncedSearch, setDebouncedSearch] = useState(values.search);

  // Sincroniza el estado local cuando la URL cambia por fuera del provider.
  // Si el estado ya coincide (incluida una navegación propia recién aplicada),
  // no hace nada: evita bucles y parpadeos.
  useEffect(() => {
    setValues((prev) => (areValuesEqual(prev, urlValues) ? prev : urlValues));
    setDebouncedSearch((prev) => (prev === urlValues.search ? prev : urlValues.search));
  }, [urlValues]);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(values.search), SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [values.search]);

  const buildQueryString = useCallback(() => {
    const params = new URLSearchParams();

    if (values.category) params.set('category', values.category);
    values.sizes.forEach((size) => params.append('sizes', size));
    values.colors.forEach((color) => params.append('colors', color));

    const range = priceRanges.find((item) => item.label === values.rangeLabel);
    if (range) {
      params.set('minPrice', String(range.min));
      if (range.max !== Infinity) params.set('maxPrice', String(range.max));
    }

    if (values.inStock) params.set('inStock', 'true');
    if (debouncedSearch.trim()) params.set('search', debouncedSearch.trim());
    if (values.sort && values.sort !== 'newest') params.set('sort', values.sort);

    return params.toString();
  }, [values, debouncedSearch, priceRanges]);

  // Aplicación en vivo: navega solo cuando cambia el estado de filtros.
  // El guard `lastQueryRef` evita disparar `router.replace` en cada render
  // (buildQueryString cambia de identidad con cada render del servidor) y,
  // sobre todo, evita "corregir" la URL durante transiciones donde los props
  // todavía están desfasados (eso causaba un ping-pong /catalogo ↔ /catalogo?…).
  const lastQueryRef = useRef<string | null>(null);
  useEffect(() => {
    const query = buildQueryString();
    if (lastQueryRef.current === query) return;
    lastQueryRef.current = query;
    if (query === managedQueryFromUrl(window.location.search)) return;
    router.replace(`/catalogo${query ? `?${query}` : ''}`, { scroll: false });
  }, [buildQueryString, router]);

  const setCategory = useCallback((category?: string) => {
    setValues((prev) => ({ ...prev, category }));
  }, []);

  const toggleSize = useCallback((size: string) => {
    setValues((prev) => ({
      ...prev,
      sizes: prev.sizes.includes(size) ? prev.sizes.filter((item) => item !== size) : [...prev.sizes, size],
    }));
  }, []);

  const toggleColor = useCallback((color: string) => {
    setValues((prev) => ({
      ...prev,
      colors: prev.colors.includes(color) ? prev.colors.filter((item) => item !== color) : [...prev.colors, color],
    }));
  }, []);

  const setRange = useCallback((label?: string) => {
    setValues((prev) => ({ ...prev, rangeLabel: label }));
  }, []);

  const setInStock = useCallback((inStock: boolean) => {
    setValues((prev) => ({ ...prev, inStock }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setValues((prev) => ({ ...prev, search }));
  }, []);

  const setSort = useCallback((sort: CatalogSortValue) => {
    setValues((prev) => ({ ...prev, sort }));
  }, []);

  const clearAll = useCallback(() => {
    setValues({ sizes: [], colors: [], inStock: false, search: '', sort: 'newest' });
    setDebouncedSearch('');
  }, []);

  const activeCount =
    (values.category ? 1 : 0) +
    values.sizes.length +
    values.colors.length +
    (values.rangeLabel ? 1 : 0) +
    (values.inStock ? 1 : 0) +
    (values.search.trim() ? 1 : 0);

  const contextValue = useMemo<CatalogFiltersContextValue>(
    () => ({
      values,
      priceRanges,
      categories,
      activeCount,
      hasFilters: activeCount > 0,
      setCategory,
      toggleSize,
      toggleColor,
      setRange,
      setInStock,
      setSearch,
      setSort,
      clearAll,
    }),
    [
      values,
      priceRanges,
      categories,
      activeCount,
      setCategory,
      toggleSize,
      toggleColor,
      setRange,
      setInStock,
      setSearch,
      setSort,
      clearAll,
    ],
  );

  return <CatalogFiltersContext.Provider value={contextValue}>{children}</CatalogFiltersContext.Provider>;
}

export function useCatalogFilters(): CatalogFiltersContextValue {
  const context = useContext(CatalogFiltersContext);
  if (!context) {
    throw new Error('useCatalogFilters debe usarse dentro de CatalogFiltersProvider');
  }
  return context;
}
