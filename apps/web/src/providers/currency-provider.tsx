'use client';

import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';

import { useStoreConfig } from './config-provider';

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchangeRate: number;
  isDefault: boolean;
  isActive: boolean;
  sortOrder: number;
}

interface CurrencyContextValue {
  currencies: Currency[];
  selectedCurrency: Currency;
  setCurrencyCode: (code: string) => void;
  format: (amount: number) => string;
  convert: (amount: number) => number;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const STORAGE_KEY = 'nova-selected-currency';

export function CurrencyProvider({
  children,
  initialCurrencies,
}: {
  children: ReactNode;
  initialCurrencies?: Currency[];
}) {
  const config = useStoreConfig();
  const [currencies, setCurrencies] = useState<Currency[]>(initialCurrencies ?? []);
  const [isLoading, setIsLoading] = useState(!initialCurrencies);
  const [selectedCode, setSelectedCode] = useState<string | null>(null);

  useEffect(() => {
    const stored = typeof window !== 'undefined' ? window.localStorage.getItem(STORAGE_KEY) : null;
    if (stored) setSelectedCode(stored);
  }, []);

  useEffect(() => {
    if (initialCurrencies) {
      setCurrencies(initialCurrencies);
      setIsLoading(false);
      return;
    }

    async function load() {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/currencies`);
        if (res.ok) {
          const data = (await res.json()) as Currency[];
          setCurrencies(data);
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    }

    void load();
  }, [initialCurrencies]);

  const selectedCurrency = useMemo(() => {
    const byStored = selectedCode ? currencies.find((c) => c.code === selectedCode) : undefined;
    const byConfig = currencies.find((c) => c.code === config.currencyCode);
    const byDefault = currencies.find((c) => c.isDefault);
    return byStored ?? byConfig ?? byDefault ?? {
      id: '',
      code: config.currencyCode,
      name: config.currencyCode,
      symbol: config.currencyCode,
      exchangeRate: 1,
      isDefault: true,
      isActive: true,
      sortOrder: 0,
    };
  }, [currencies, selectedCode, config.currencyCode]);

  const setCurrencyCode = useCallback((code: string) => {
    setSelectedCode(code);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(STORAGE_KEY, code);
    }
  }, []);

  const convert = useCallback(
    (amount: number) => Math.round(amount * selectedCurrency.exchangeRate),
    [selectedCurrency.exchangeRate],
  );

  const format = useCallback(
    (amount: number) => {
      const converted = convert(amount);
      const formatted = converted.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
      return `${selectedCurrency.symbol} ${formatted}`;
    },
    [convert, selectedCurrency.symbol],
  );

  return (
    <CurrencyContext.Provider
      value={{ currencies, selectedCurrency, setCurrencyCode, format, convert, isLoading }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (!context) {
    throw new Error('useCurrency must be used within CurrencyProvider');
  }
  return context;
}

export function formatPriceFallback(amount: number, currencyCode: string) {
  return `${currencyCode} ${amount.toLocaleString()}`;
}
