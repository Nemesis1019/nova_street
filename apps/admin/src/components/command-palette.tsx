'use client';

import { Loader } from '@mantine/core';
import { useHotkeys } from '@mantine/hooks';
import { useQuery } from '@tanstack/react-query';
import { AnimatePresence, motion } from 'framer-motion';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';

import { apiClient } from '../lib/api';
import { useTranslation } from '../providers/i18n-provider';
import { Icon } from './ui/icon';
import { popIn } from './ui/motion';

type SearchResults = {
  products: Array<{ id: string; title: string; url: string }>;
  orders: Array<{ id: string; title: string; url: string }>;
  users: Array<{ id: string; title: string; url: string }>;
  pages: Array<{ id: string; title: string; url: string }>;
};

export function CommandPalette() {
  const { t } = useTranslation();
  const [opened, setOpened] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const barInputRef = useRef<HTMLInputElement>(null);
  const panelInputRef = useRef<HTMLInputElement>(null);

  const open = useCallback(() => {
    setOpened(true);
    window.setTimeout(() => {
      const barInput = barInputRef.current;
      const target = barInput && barInput.offsetParent !== null ? barInput : panelInputRef.current;
      target?.focus();
    }, 40);
  }, []);

  useHotkeys([
    ['mod+K', open],
    ['ctrl+K', open],
  ]);

  useEffect(() => {
    if (!opened) return;
    const onPointerDown = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) {
        setOpened(false);
      }
    };
    document.addEventListener('mousedown', onPointerDown);
    return () => document.removeEventListener('mousedown', onPointerDown);
  }, [opened]);

  useEffect(() => {
    if (!opened) setQuery('');
  }, [opened]);

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
    { title: t('header.resultsProducts'), items: data?.products ?? [] },
    { title: t('header.resultsOrders'), items: data?.orders ?? [] },
    { title: t('header.resultsUsers'), items: data?.users ?? [] },
    { title: t('header.resultsPages'), items: data?.pages ?? [] },
  ];

  const hasQuery = query.trim().length > 0;
  const noResults = !isFetching && hasQuery && sections.every((section) => section.items.length === 0);

  return (
    <div ref={rootRef} className="relative">
      {/* Barra de búsqueda (desktop): el input vive acá, sin duplicados en el panel */}
      <div className="relative hidden w-72 items-center md:flex xl:w-96">
        <Icon name="search" className="pointer-events-none absolute left-3 z-10 text-[18px] text-on-surface-variant" />
        <input
          ref={barInputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.currentTarget.value);
            setOpened(true);
          }}
          onFocus={() => setOpened(true)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              setOpened(false);
              event.currentTarget.blur();
            }
          }}
          placeholder={t('header.searchPlaceholder')}
          autoComplete="off"
          spellCheck={false}
          aria-label={t('common.search')}
          className="w-full rounded-lg border border-outline-variant bg-surface-container-low py-1.5 pl-9 pr-12 font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant/60 shadow-soft transition-colors hover:bg-surface-container focus:border-primary focus:outline-none"
        />
        <kbd className="pointer-events-none absolute right-2.5 rounded border border-outline-variant/30 bg-surface-container-lowest px-1.5 py-0.5 font-label-sm text-label-sm text-on-surface-variant">
          ⌘K
        </kbd>
      </div>

      {/* Botón de búsqueda (mobile) */}
      <button
        type="button"
        onClick={() => (opened ? setOpened(false) : open())}
        aria-label={t('common.search')}
        className="flex items-center justify-center rounded-lg p-1.5 text-on-surface-variant transition-colors hover:bg-surface-container-low hover:text-on-surface md:hidden"
      >
        <Icon name="search" className="text-[22px]" />
      </button>

      <AnimatePresence>
        {opened && (
          <motion.div
            variants={popIn}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="fixed left-4 right-4 top-[4.5rem] z-50 flex flex-col rounded-xl border border-outline-variant/30 bg-surface-container-lowest p-4 shadow-pop md:absolute md:left-0 md:right-auto md:top-full md:mt-2 md:w-[26rem]"
          >
          {/* En mobile la barra es un icono: el input vive dentro del panel */}
          <div className="relative mb-3 flex items-center md:hidden">
            <Icon name="search" className="pointer-events-none absolute left-3 text-[18px] text-on-surface-variant" />
            <input
              ref={panelInputRef}
              value={query}
              onChange={(event) => setQuery(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape') setOpened(false);
              }}
              placeholder={t('header.mobileSearchPlaceholder')}
              autoComplete="off"
              spellCheck={false}
              aria-label={t('common.search')}
              className="w-full rounded-lg border border-outline-variant/50 bg-surface-container-lowest py-2 pl-9 pr-3 font-body-sm text-body-sm text-on-surface placeholder:text-on-surface-variant/60 focus:border-primary focus:outline-none"
            />
          </div>

          {isFetching && (
            <div className="flex justify-center py-4">
              <Loader size="sm" color="dark" />
            </div>
          )}

          {!hasQuery && !isFetching && (
            <p className="font-body-sm text-body-sm text-on-surface-variant">{t('header.searchHint')}</p>
          )}

          {hasQuery && (
            <div className="flex max-h-[55vh] flex-col gap-4 overflow-y-auto">
              {sections.map((section) =>
                section.items.length === 0 ? null : (
                  <div key={section.title}>
                    <div className="mb-2 font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
                      {section.title}
                    </div>
                    <div className="flex flex-col">
                      {section.items.map((item) => (
                        <Link
                          key={item.id}
                          href={item.url}
                          onClick={() => setOpened(false)}
                          className="flex items-center gap-2 rounded-lg px-2 py-1.5 font-body-sm text-body-sm text-on-surface transition-colors hover:bg-surface-container-low"
                        >
                          <Icon name="arrow_forward" className="text-[14px] text-on-surface-variant" />
                          {item.title}
                        </Link>
                      ))}
                    </div>
                  </div>
                ),
              )}
              {noResults && (
                <p className="font-body-sm text-body-sm text-on-surface-variant">{t('header.noResults')}</p>
              )}
            </div>
          )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
