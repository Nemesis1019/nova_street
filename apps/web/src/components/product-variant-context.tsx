'use client';

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from 'react';

interface ProductVariantContextValue {
  selectedVariantId: string;
  setSelectedVariantId: (variantId: string) => void;
}

const ProductVariantContext = createContext<ProductVariantContextValue | null>(null);

export function ProductVariantProvider({
  initialVariantId,
  children,
}: {
  initialVariantId: string;
  children: ReactNode;
}) {
  const [selectedVariantId, setSelectedVariantId] = useState(initialVariantId);
  const value = useMemo(
    () => ({ selectedVariantId, setSelectedVariantId }),
    [selectedVariantId],
  );

  return <ProductVariantContext.Provider value={value}>{children}</ProductVariantContext.Provider>;
}

/** Devuelve null fuera de la ficha de producto. */
export function useProductVariantContext() {
  return useContext(ProductVariantContext);
}
