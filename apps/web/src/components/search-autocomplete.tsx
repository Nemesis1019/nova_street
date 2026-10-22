'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';

import { apiClient } from '../lib/api';
import { useCurrency } from '../providers/currency-provider';

const DEBOUNCE_MS = 300;

function thumbUrl(url?: string): string | undefined {
  if (!url) return undefined;
  return url.includes('?') ? `${url}&w=96&format=webp` : `${url}?w=96&format=webp`;
}

export function SearchAutocomplete() {
  const router = useRouter();
  const { format } = useCurrency();
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Búsqueda en vivo con debounce: se consulta mientras se escribe.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isFetching } = useQuery({
    queryKey: ['search-suggestions', debouncedQuery],
    enabled: debouncedQuery.length >= 2,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/catalog/search-suggestions', {
        params: { query: { q: debouncedQuery, limit: '5' } },
      });
      if (error) throw error;
      return data;
    },
  });

  const suggestions = debouncedQuery.length >= 2 ? data?.data ?? [] : [];
  const showPanel = open && query.trim().length >= 2;

  useEffect(() => {
    setActiveIndex(-1);
  }, [debouncedQuery]);

  // Cerrar al hacer click fuera o con Escape.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [open]);

  const goToSearch = () => {
    const q = query.trim();
    if (!q) return;
    router.push(`/catalogo?search=${encodeURIComponent(q)}`);
    setOpen(false);
  };

  const goToProduct = (slug: string) => {
    router.push(`/producto/${slug}`);
    setQuery('');
    setOpen(false);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      const highlighted = activeIndex >= 0 ? suggestions[activeIndex] : undefined;
      if (highlighted) {
        goToProduct(highlighted.slug);
      } else {
        goToSearch();
      }
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setActiveIndex((index) => Math.min(index + 1, suggestions.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setActiveIndex((index) => Math.max(index - 1, -1));
      return;
    }
    if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  return (
    <div ref={containerRef} style={{ position: 'relative', width: 260 }}>
      <input
        type="text"
        placeholder="Buscar..."
        value={query}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        aria-label="Buscar productos"
        aria-expanded={showPanel}
        role="combobox"
        aria-autocomplete="list"
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #0d0d0d',
          backgroundColor: 'transparent',
          fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
          fontSize: '14px',
        }}
      />

      {showPanel && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            minWidth: '100%',
            width: 'max-content',
            maxWidth: 340,
            backgroundColor: '#fcf9f8',
            border: '1px solid #0d0d0d',
            borderTop: 'none',
            zIndex: 200,
            boxShadow: '0 12px 28px rgba(13,13,13,0.12)',
          }}
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion.id}
              type="button"
              role="option"
              aria-selected={index === activeIndex}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => goToProduct(suggestion.slug)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                width: '100%',
                padding: '8px 10px',
                border: 'none',
                borderBottom: '1px solid rgba(13,13,13,0.08)',
                backgroundColor: index === activeIndex ? '#f6f3f2' : 'transparent',
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {suggestion.imageUrl ? (
                <img
                  src={thumbUrl(suggestion.imageUrl)}
                  alt=""
                  loading="lazy"
                  style={{
                    width: 38,
                    height: 38,
                    objectFit: 'cover',
                    border: '1px solid rgba(13,13,13,0.15)',
                    flexShrink: 0,
                  }}
                />
              ) : (
                <span
                  aria-hidden="true"
                  style={{
                    width: 38,
                    height: 38,
                    backgroundColor: '#f6f3f2',
                    border: '1px solid rgba(13,13,13,0.15)',
                    flexShrink: 0,
                  }}
                />
              )}
              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: 'block',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    fontFamily: 'var(--font-bebas-neue), Bebas Neue, Impact, sans-serif',
                    fontSize: 16,
                    letterSpacing: '0.02em',
                  }}
                >
                  {suggestion.name}
                </span>
                <span
                  style={{
                    display: 'block',
                    fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
                    fontSize: 11,
                    color: '#747878',
                  }}
                >
                  {format(suggestion.price)}
                </span>
              </span>
            </button>
          ))}

          {isFetching && suggestions.length === 0 && (
            <div
              style={{
                padding: '12px',
                fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
                fontSize: 12,
                color: '#747878',
              }}
            >
              Buscando...
            </div>
          )}

          {!isFetching && suggestions.length === 0 && debouncedQuery.length >= 2 && (
            <div
              style={{
                padding: '12px',
                fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
                fontSize: 12,
                color: '#747878',
              }}
            >
              Sin resultados para “{debouncedQuery}”.
            </div>
          )}

          <button
            type="button"
            onClick={goToSearch}
            style={{
              display: 'block',
              width: '100%',
              padding: '10px 12px',
              border: 'none',
              backgroundColor: '#0d0d0d',
              color: '#fcf9f8',
              fontFamily: 'var(--font-bebas-neue), Bebas Neue, Impact, sans-serif',
              fontSize: 15,
              letterSpacing: '0.06em',
              textTransform: 'uppercase',
              cursor: 'pointer',
            }}
          >
            Ver todos los resultados
          </button>
        </div>
      )}
    </div>
  );
}
