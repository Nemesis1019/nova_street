'use client';

import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

import { apiClient } from '../lib/api';

export function SearchAutocomplete() {
  const router = useRouter();
  const [query, setQuery] = useState('');

  const { data } = useQuery({
    queryKey: ['search-suggestions', query],
    queryFn: async () => {
      if (query.trim().length < 2) return { data: [] };
      const { data, error } = await apiClient.GET('/catalog/search-suggestions', {
        params: { query: { q: query.trim(), limit: '5' } },
      });
      if (error) throw error;
      return data;
    },
    enabled: query.trim().length >= 2,
  });

  const suggestions = data?.data ?? [];

  return (
    <div style={{ position: 'relative', width: 240 }}>
      <input
        type="text"
        placeholder="Buscar..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && query.trim()) {
            router.push(`/catalogo?q=${encodeURIComponent(query.trim())}`);
            setQuery('');
          }
        }}
        style={{
          width: '100%',
          padding: '8px 12px',
          border: '1px solid #0d0d0d',
          backgroundColor: 'transparent',
          fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
          fontSize: '14px',
        }}
      />
      {suggestions.length > 0 && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: '#fcf9f8',
            border: '1px solid #0d0d0d',
            zIndex: 200,
          }}
        >
          {suggestions.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                router.push(`/producto/${s.slug}`);
                setQuery('');
              }}
              style={{
                display: 'block',
                width: '100%',
                textAlign: 'left',
                padding: '8px 12px',
                border: 'none',
                borderBottom: '1px solid rgba(13,13,13,0.1)',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
                fontSize: '13px',
              }}
            >
              {s.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
