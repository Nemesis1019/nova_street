'use client';

import { Badge, Button, NumberInput, Select, Stack, Text } from '@mantine/core';
import { IconArrowForward, IconCheck } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { useMemo, useRef, useState } from 'react';

import { apiClient } from '../lib/api';
import { flyToCart } from '../lib/fly-to-cart';
import { getApiErrorMessage, notifyError } from '../lib/notifications';
import { useCurrency } from '../providers/currency-provider';
import { useAuthStore } from '../store/auth-store';
import { useCartStore } from '../store/cart-store';

interface ProductVariant {
  id: string;
  size?: string | null;
  color?: string | null;
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
}

export function AddToCartButton({ product, imageUrl }: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState(product.variants[0]?.id ?? '');
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
            border: '1px solid #0d0d0d',
            borderRadius: 0,
            backgroundColor: '#fcf9f8',
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
            border: '1px solid #0d0d0d',
            borderRadius: 0,
            backgroundColor: '#fcf9f8',
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
          backgroundColor: justAdded ? '#6f7a4e' : '#0d0d0d',
          color: '#fcf9f8',
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
