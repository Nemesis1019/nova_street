import { useCallback, useEffect, useState } from 'react';

const STORAGE_KEY = 'nova-comparator';

export function useComparator() {
  const [items, setItems] = useState<string[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setItems(JSON.parse(raw));
    } catch {
      // ignore
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    }
  }, [items, hydrated]);

  const add = useCallback((slug: string) => {
    setItems((prev) => {
      if (prev.includes(slug)) return prev;
      if (prev.length >= 4) return prev;
      return [...prev, slug];
    });
  }, []);

  const remove = useCallback((slug: string) => {
    setItems((prev) => prev.filter((s) => s !== slug));
  }, []);

  const toggle = useCallback((slug: string) => {
    setItems((prev) => {
      if (prev.includes(slug)) return prev.filter((s) => s !== slug);
      if (prev.length >= 4) return prev;
      return [...prev, slug];
    });
  }, []);

  const clear = useCallback(() => setItems([]), []);

  const isSelected = useCallback((slug: string) => items.includes(slug), [items]);

  return { items, hydrated, add, remove, toggle, clear, isSelected };
}
