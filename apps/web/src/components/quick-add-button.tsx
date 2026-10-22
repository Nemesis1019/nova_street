'use client';

import { ActionIcon, Group, Popover, Stack, Text, Tooltip, UnstyledButton } from '@mantine/core';
import { IconCheck, IconShoppingBagPlus } from '@tabler/icons-react';
import { useQueryClient } from '@tanstack/react-query';
import { type MouseEvent, useRef, useState } from 'react';

import { apiClient } from '../lib/api';
import { flyToCart } from '../lib/fly-to-cart';
import { getApiErrorMessage, notifyError } from '../lib/notifications';
import { useAuthStore } from '../store/auth-store';
import { useCartStore } from '../store/cart-store';

export interface QuickAddVariant {
  id: string;
  sku?: string;
  size?: string | null;
  color?: string | null;
  stockMode?: string;
  inStock?: boolean;
  availableQuantity?: number;
  priceAdjustment?: number;
}

interface QuickAddButtonProps {
  product: {
    name: string;
    basePrice: number;
    imageUrl?: string;
    variants: QuickAddVariant[];
  };
}

function variantLabel(variant: QuickAddVariant) {
  return [variant.size, variant.color].filter(Boolean).join(' · ') || variant.sku || '';
}

/**
 * Agregar al carrito desde la card. Si el producto tiene una sola variante
 * agrega directo; si tiene varias abre un selector. Funciona con sesión
 * (POST /cart/items) y como invitado (carrito local).
 */
export function QuickAddButton({ product }: QuickAddButtonProps) {
  const [opened, setOpened] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [justAdded, setJustAdded] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const addItem = useCartStore((state) => state.addItem);
  const { isAuthenticated } = useAuthStore();
  const queryClient = useQueryClient();

  const variants = product.variants.filter((variant) => variant.inStock !== false);
  if (variants.length === 0) return null;

  const add = async (variant: QuickAddVariant) => {
    setPendingId(variant.id);
    try {
      if (isAuthenticated) {
        const { error } = await apiClient.POST('/cart/items', {
          body: { type: 'STANDARD', productVariantId: variant.id, quantity: 1 } as never,
        });
        if (error) throw error;
        queryClient.invalidateQueries({ queryKey: ['cart'] });
      } else {
        addItem({
          type: 'STANDARD',
          productVariantId: variant.id,
          quantity: 1,
          name: product.name,
          price: product.basePrice + (variant.priceAdjustment ?? 0),
          sku: variant.sku,
          size: variant.size ?? null,
          color: variant.color ?? null,
          imageUrl: product.imageUrl,
        });
      }

      // Feedback visual: la foto vuela al carrito y el botón muestra un check.
      flyToCart(buttonRef.current, product.imageUrl);
      setJustAdded(true);
      window.setTimeout(() => setJustAdded(false), 1100);
      setOpened(false);
    } catch (error) {
      notifyError({ title: 'Error al agregar', message: getApiErrorMessage(error) });
    } finally {
      setPendingId(null);
    }
  };

  const stop = (event: MouseEvent) => {
    // La card entera es un link: evitamos navegar al producto.
    event.preventDefault();
    event.stopPropagation();
  };

  const iconButton = (
    <ActionIcon
      ref={buttonRef}
      variant="default"
      radius="xl"
      size={36}
      aria-label={justAdded ? 'Agregado al carrito' : 'Agregar al carrito'}
      loading={variants.length === 1 && pendingId !== null && !justAdded}
      onClick={(event) => {
        stop(event);
        if (variants.length === 1) {
          void add(variants[0]);
        } else {
          // Popover controlado: Mantine no maneja el toggle solo, lo hacemos acá.
          setOpened((current) => !current);
        }
      }}
      style={{
        backgroundColor: justAdded ? '#0d0d0d' : 'rgba(252, 249, 248, 0.94)',
        border: '1px solid #0d0d0d',
        color: justAdded ? '#fcf9f8' : '#0d0d0d',
        transition: 'background-color 180ms ease, color 180ms ease',
      }}
    >
      {justAdded ? (
        <IconCheck size={20} className="nova-pop" />
      ) : (
        <IconShoppingBagPlus size={20} />
      )}
    </ActionIcon>
  );

  if (variants.length === 1) {
    return (
      <span onClick={stop} role="presentation">
        <Tooltip label="Agregar al carrito" withArrow>
          {iconButton}
        </Tooltip>
      </span>
    );
  }

  return (
    <span onClick={stop} role="presentation">
      <Popover opened={opened} onChange={setOpened} position="bottom-start" shadow="md" radius={0} withArrow>
        <Popover.Target>{iconButton}</Popover.Target>
        <Popover.Dropdown p="xs" style={{ border: '1px solid #0d0d0d', backgroundColor: '#fcf9f8' }}>
          <Stack gap={2}>
            <Text
              size="xs"
              c="dimmed"
              style={{
                fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Elegí una opción
            </Text>
            {variants.map((variant) => (
              <UnstyledButton
                key={variant.id}
                disabled={pendingId === variant.id}
                onClick={(event) => {
                  stop(event);
                  void add(variant);
                }}
                style={{
                  padding: '7px 10px',
                  border: '1px solid transparent',
                  opacity: pendingId === variant.id ? 0.6 : 1,
                }}
                className="nova-quick-add-option"
              >
                <Group justify="space-between" gap="lg" wrap="nowrap">
                  <Text size="sm" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                    {variantLabel(variant) || 'Única'}
                  </Text>
                  {variant.stockMode === 'TRACKED' && typeof variant.availableQuantity === 'number' && (
                    <Text size="xs" c="dimmed">
                      {variant.availableQuantity} disp.
                    </Text>
                  )}
                </Group>
              </UnstyledButton>
            ))}
          </Stack>
        </Popover.Dropdown>
      </Popover>
    </span>
  );
}
