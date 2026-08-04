'use client';

import { Badge, Button, NumberInput, Select, Stack, Text } from '@mantine/core';
import { IconArrowForward } from '@tabler/icons-react';
import { useMemo, useState } from 'react';

import { apiClient } from '../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../lib/notifications';
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
}

interface AddToCartButtonProps {
  product: {
    id: string;
    name: string;
    slug: string;
    basePrice: number;
    variants: ProductVariant[];
  };
}

export function AddToCartButton({ product }: AddToCartButtonProps) {
  const [quantity, setQuantity] = useState(1);
  const [selectedVariantId, setSelectedVariantId] = useState(product.variants[0]?.id ?? '');
  const [isAdding, setIsAdding] = useState(false);
  const addItem = useCartStore((state) => state.addItem);
  const { isAuthenticated } = useAuthStore();

  const selectedVariant = useMemo(
    () => product.variants.find((v) => v.id === selectedVariantId),
    [product.variants, selectedVariantId],
  );

  const isTracked = selectedVariant?.stockMode === 'TRACKED';
  const canAdd = selectedVariant?.inStock ?? true;
  const maxQuantity = isTracked
    ? Math.max(1, selectedVariant?.availableQuantity ?? 0)
    : 10;

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
      } else {
        addItem({
          type: 'STANDARD',
          productVariantId: selectedVariantId,
          quantity,
          name: product.name,
          price: product.basePrice,
        });
      }
      notifySuccess({ title: 'Agregado al carrito', message: `${product.name} x ${quantity}` });
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
        data={product.variants.map((variant) => ({
          value: variant.id,
          label: [variant.size, variant.color, variant.sku].filter(Boolean).join(' / '),
        }))}
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
        onClick={handleAdd}
        size="lg"
        fullWidth
        loading={isAdding}
        disabled={!canAdd}
        rightSection={<IconArrowForward size={18} />}
        style={{
          backgroundColor: '#0d0d0d',
          color: '#fcf9f8',
          fontFamily: 'var(--font-bebas-neue), Bebas Neue, Impact, sans-serif',
          letterSpacing: '0.05em',
        }}
      >
        {canAdd ? 'Añadir al Carrito' : 'Sin stock'}
      </Button>
    </Stack>
  );
}
