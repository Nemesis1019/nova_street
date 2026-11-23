'use client';

import { Badge, Button, NumberInput, Select, Stack, Text } from '@mantine/core';
import { IconArrowForward, IconCheck } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';

import { apiClient } from '../lib/api';
import { flyToCart } from '../lib/fly-to-cart';
import { getApiErrorMessage, notifyError } from '../lib/notifications';
import { uniqueProductColors } from '../lib/product-colors';
import { useCurrency } from '../providers/currency-provider';
import { useAuthStore } from '../store/auth-store';
import { useCartStore } from '../store/cart-store';
import { useProductVariantContext } from './product-variant-context';

interface ProductVariant {
  id: string;
  size?: string | null;
  color?: string | null;
  colorHex?: string | null;
  sku: string;
  stockMode?: string;
  availableQuantity?: number;
  inStock?: boolean;
  priceAdjustment?: number;
}

interface AddToCartButtonProps {
  product: {
    id: string;
    name: string;
    slug: string;
    basePrice: number;
    variants: ProductVariant[];
  };
  /** Imagen principal para el carrito local (invitados). */
  imageUrl?: string;
  showColorSwatches?: boolean;
  showSizeSwatches?: boolean;
}

export function AddToCartButton({
  product,
  imageUrl,
  showColorSwatches = true,
  showSizeSwatches = true,
}: AddToCartButtonProps) {
  const variantContext = useProductVariantContext();
  const [quantity, setQuantity] = useState(1);
  const [localVariantId, setLocalVariantId] = useState(product.variants[0]?.id ?? '');
  const selectedVariantId = variantContext?.selectedVariantId ?? localVariantId;
  const setSelectedVariantId = variantContext?.setSelectedVariantId ?? setLocalVariantId;
  const [isAdding, setIsAdding] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const addItem = useCartStore((state) => state.addItem);
  const { isAuthenticated } = useAuthStore();
  const { format } = useCurrency();
  const queryClient = useQueryClient();

  const selectedVariant = useMemo(
    () => product.variants.find((v) => v.id === selectedVariantId),
    [product.variants, selectedVariantId],
  );

  const isTracked = selectedVariant?.stockMode === 'TRACKED';
  const canAdd = selectedVariant?.inStock ?? true;
  const maxQuantity = isTracked
    ? Math.max(1, selectedVariant?.availableQuantity ?? 0)
    : 10;
  const variantPrice = (variant: ProductVariant) =>
    product.basePrice + (variant.priceAdjustment ?? 0);
  const colorOptions = uniqueProductColors(product.variants);
  const activeColor = selectedVariant?.color ?? colorOptions[0]?.color ?? null;

  const selectColor = (color: string) => {
    const normalized = color.trim().toLowerCase();
    const sameSize = product.variants.find(
      (variant) =>
        variant.color?.trim().toLowerCase() === normalized &&
        variant.size === selectedVariant?.size,
    );
    const next =
      sameSize ??
      product.variants.find((variant) => variant.color?.trim().toLowerCase() === normalized);
    if (next) setSelectedVariantId(next.id);
  };

  const variantsForActiveColor = activeColor
    ? product.variants.filter(
        (variant) => variant.color?.trim().toLowerCase() === activeColor.trim().toLowerCase(),
      )
    : product.variants;
  const sizeOptions = Array.from(
    new Set(
      variantsForActiveColor
        .map((variant) => variant.size?.trim())
        .filter((size): size is string => Boolean(size)),
    ),
  );

  const selectSize = (size: string) => {
    const next =
      variantsForActiveColor.find((variant) => variant.size?.trim() === size) ??
      product.variants.find((variant) => variant.size?.trim() === size);
    if (next) setSelectedVariantId(next.id);
  };

  const handleAdd = async () => {
    if (!selectedVariantId || !canAdd) return;
    setIsAdding(true);

    try {
      if (isAuthenticated) {
        const { error } = await apiClient.POST('/cart/items', {
          body: {
            type: 'STANDARD',
            productVariantId: selectedVariantId,
            quantity,
          } as never,
        });
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['cart'] });
      } else {
        addItem({
          type: 'STANDARD',
          productVariantId: selectedVariantId,
          quantity,
          name: product.name,
          price: selectedVariant ? variantPrice(selectedVariant) : product.basePrice,
          sku: selectedVariant?.sku,
          size: selectedVariant?.size ?? null,
          color: selectedVariant?.color ?? null,
          imageUrl,
        });
      }

      // Feedback visual en lugar del aviso: la foto vuela al carrito.
      flyToCart(buttonRef.current, imageUrl);
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 1300);
    } catch (error) {
      notifyError({ title: 'Error al agregar', message: getApiErrorMessage(error) });
    } finally {
      setIsAdding(false);
    }
  };

  if (product.variants.length === 0) {
    return <Text size="sm">Producto no disponible</Text>;
  }

  return (
    <Stack gap="md">
      {showColorSwatches && colorOptions.length > 1 && (
        <div>
          <Text
            size="xs"
            style={{
              fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
              textTransform: 'uppercase',
              fontSize: 12,
              letterSpacing: '0.05em',
              marginBottom: 6,
            }}
          >
            Color
          </Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            {colorOptions.map((option) => {
              const active = option.color.toLowerCase() === activeColor?.toLowerCase();
              return (
                <button
                  key={option.color}
                  type="button"
                  aria-label={`Color ${option.color}`}
                  aria-pressed={active}
                  title={option.color}
                  onClick={() => selectColor(option.color)}
                  style={{
                    width: 30,
                    height: 30,
                    padding: 0,
                    border: 0,
                    background: 'transparent',
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <span
                    style={{
                      display: 'block',
                      width: 20,
                      height: 20,
                      borderRadius: '50%',
                      backgroundColor: option.hex,
                      border: active
                        ? '2px solid var(--sf-color-text, #0d0d0d)'
                        : '1px solid rgba(13, 13, 13, 0.28)',
                      boxShadow: active
                        ? '0 0 0 3px var(--sf-color-surface, #fcf9f8)'
                        : undefined,
                    }}
                  />
                </button>
              );
            })}
          </div>
        </div>
      )}
      {showSizeSwatches && sizeOptions.length > 1 && (
        <div>
          <Text
            size="xs"
            style={{
              fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
              textTransform: 'uppercase',
              fontSize: 12,
              letterSpacing: '0.05em',
              marginBottom: 6,
            }}
          >
            Talle
          </Text>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {sizeOptions.map((size) => {
              const active = selectedVariant?.size?.trim() === size;
              return (
                <button
                  key={size}
                  type="button"
                  aria-label={`Talle ${size}`}
                  aria-pressed={active}
                  onClick={() => selectSize(size)}
                  style={{
                    minWidth: 38,
                    height: 32,
                    padding: '0 10px',
                    border: '1px solid var(--sf-color-text, #0d0d0d)',
                    backgroundColor: active
                      ? 'var(--sf-color-text, #0d0d0d)'
                      : 'transparent',
                    color: active
                      ? 'var(--sf-color-surface, #fcf9f8)'
                      : 'var(--sf-color-text, #0d0d0d)',
                    fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
                    fontSize: 11,
                    letterSpacing: '0.04em',
                    cursor: 'pointer',
                  }}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      )}
      <Select
        label="Variante"
        value={selectedVariantId}
        onChange={(value) => setSelectedVariantId(value ?? '')}
        data={product.variants.map((variant) => {
          const label = [variant.size, variant.color].filter(Boolean).join(' / ') || variant.sku;
          return {
            value: variant.id,
            label: `${label} · ${format(variantPrice(variant))}`,
          };
        })}
        styles={{
          label: {
            fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
            textTransform: 'uppercase',
            fontSize: '12px',
            letterSpacing: '0.05em',
          },
          input: {
            border: '1px solid var(--sf-color-text, #0d0d0d)',
            borderRadius: 0,
            backgroundColor: 'var(--sf-color-surface, #fcf9f8)',
          },
        }}
      />
      {selectedVariant && (
        <Badge variant="outline" color={canAdd ? 'dark' : 'red'} radius={0} style={{ width: 'fit-content' }}>
          {isTracked
            ? canAdd
              ? `En stock (${selectedVariant.availableQuantity} disponibles)`
              : 'Agotado'
            : 'Bajo pedido'}
        </Badge>
      )}
      <NumberInput
        label="Cantidad"
        value={quantity}
        onChange={(value) => setQuantity(Number(value) || 1)}
        min={1}
        max={maxQuantity}
        disabled={!canAdd}
        style={{ maxWidth: 120 }}
        styles={{
          label: {
            fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
            textTransform: 'uppercase',
            fontSize: '12px',
            letterSpacing: '0.05em',
          },
          input: {
            border: '1px solid var(--sf-color-text, #0d0d0d)',
            borderRadius: 0,
            backgroundColor: 'var(--sf-color-surface, #fcf9f8)',
          },
        }}
      />
      <Button
        ref={buttonRef}
        onClick={handleAdd}
        size="lg"
        fullWidth
        loading={isAdding}
        disabled={!canAdd}
        rightSection={
          justAdded ? (
            <IconCheck size={18} className="nova-pop" />
          ) : (
            <IconArrowForward size={18} />
          )
        }
        style={{
          backgroundColor: justAdded ? 'var(--sf-color-accent, #6f7a4e)' : 'var(--sf-color-text, #0d0d0d)',
          color: 'var(--sf-color-surface, #fcf9f8)',
          fontFamily: 'var(--font-bebas-neue), Bebas Neue, Impact, sans-serif',
          letterSpacing: '0.05em',
          transition: 'background-color 220ms ease',
        }}
      >
        {!canAdd ? 'Sin stock' : justAdded ? 'Agregado' : 'Añadir al Carrito'}
      </Button>
    </Stack>
  );
}
