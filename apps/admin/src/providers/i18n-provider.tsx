'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { type Dictionary,enDictionary, esDictionary, ptDictionary } from '../lib/i18n-dictionaries';

export type Locale = 'es' | 'en' | 'pt';

const dictionaries: Record<Locale, Dictionary> = { es: esDictionary, en: enDictionary, pt: ptDictionary };

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = 'nova-admin-locale';

function getNestedValue(obj: Record<string, unknown>, path: string): string | undefined {
  const parts = path.split('.');
  let current: unknown = obj;
  for (const part of parts) {
    if (current && typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof current === 'string' ? current : undefined;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('es');

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? (window.localStorage.getItem(STORAGE_KEY) as Locale | null) : null;
    if (stored && dictionaries[stored]) {
      setLocaleState(stored);
    }
  }, []);

  const setLocale = useCallback((value: Locale) => {
    if (dictionaries[value]) {
      setLocaleState(value);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, value);
      }
    }
  }, []);

  const t = useCallback(
    (key: string) => {
      const dict = dictionaries[locale] ?? dictionaries.es;
      return getNestedValue(dict as Record<string, unknown>, key) ?? getNestedValue(dictionaries.es as Record<string, unknown>, key) ?? key;
    },
    [locale],
  );

  return (
    <I18nContext.Provider value={useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t])}>
      {children}
    </I18nContext.Provider>
  );
}

export function useTranslation() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useTranslation must be used within I18nProvider');
  }
  return context;
}
