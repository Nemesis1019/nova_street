'use client';

import { Button, Container, Grid, GridCol, Group, NumberInput, Stack, Text, Title } from '@mantine/core';
import { IconArrowForward, IconTrash } from '@tabler/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';

import { ProductCard } from '../../components/product-card';
import { StoreFooter } from '../../components/store-footer';
import { StoreHeader } from '../../components/store-header';
import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';
import { parseStorefrontConfig } from '../../lib/storefront-config';
import { useStoreConfig } from '../../providers/config-provider';
import { useCurrency } from '../../providers/currency-provider';
import { useTranslation } from '../../providers/i18n-provider';
import { useAuthStore } from '../../store/auth-store';
import { useCartStore } from '../../store/cart-store';

export default function CartPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const { isAuthenticated } = useAuthStore();
  const { items: localItems, removeItem, updateQuantity } = useCartStore();

  const config = useStoreConfig();
  const storefront = parseStorefrontConfig(config.storefrontConfig);
  const crossSellConfig = storefront.crossSell;

  const { data: serverCart } = useQuery({
    queryKey: ['cart'],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/cart');
      if (error) throw error;
      return data;
    },
    enabled: isAuthenticated,
  });

  const { data: crossSellProducts } = useQuery({
    queryKey: ['cart-cross-sell', crossSellConfig.strategy, crossSellConfig.limit],
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/catalog/products', {
        params: {
          query: {
            limit: crossSellConfig.limit,
            sort: crossSellConfig.strategy === 'bestSelling' ? 'newest' : 'newest',
          },
        },
      });
      if (error) throw error;
      return data?.data ?? [];
    },
    enabled: crossSellConfig.enabled,
  });

  const updateServerItem = useMutation({
    mutationFn: async ({ itemId, quantity }: { itemId: string; quantity: number }) => {
      const { error } = await apiClient.PATCH('/cart/items/{itemId}', {
        params: { path: { itemId } },
        body: { quantity } as never,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cart'] }),
    onError: (error) => notifyError({ title: 'Error', message: getApiErrorMessage(error) }),
  });

  const removeServerItem = useMutation({
    mutationFn: async (itemId: string) => {
      const { error } = await apiClient.DELETE('/cart/items/{itemId}', {
        params: { path: { itemId } },
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
      notifySuccess({ title: 'Item eliminado' });
    },
    onError: (error) => notifyError({ title: 'Error', message: getApiErrorMessage(error) }),
  });

  const renderCart = () => {
    if (isAuthenticated) {
      const items = serverCart?.items ?? [];
      const total = serverCart?.total ?? 0;

      if (items.length === 0) {
        return <EmptyCart />;
      }

      return (
        <Grid gap="xl">
          <GridCol span={{ base: 12, md: 8 }}>
            <Stack gap="md">
              {items.map((item) => (
                <CartItemRow
                  key={item.id}
                  name={item.name ?? 'Producto'}
                  sku={item.productVariant?.sku}
                  unitPrice={item.unitPrice}
                  quantity={item.quantity}
                  onQuantityChange={(value) => updateServerItem.mutate({ itemId: item.id, quantity: value })}
                  onRemove={() => removeServerItem.mutate(item.id)}
                />
              ))}
            </Stack>
          </GridCol>
          <GridCol span={{ base: 12, md: 4 }}>
            <OrderSummary total={total} itemCount={items.length} isAuthenticated />
          </GridCol>
        </Grid>
      );
    }

    const total = localItems.reduce((sum, item) => sum + (item.price ?? 0) * item.quantity, 0);

    if (localItems.length === 0) {
      return <EmptyCart />;
    }

    return (
      <Grid gap="xl">
        <GridCol span={{ base: 12, md: 8 }}>
          <Stack gap="md">
            {localItems.map((item) => (
                <CartItemRow
                  key={item.productVariantId}
                  name={item.name || 'Producto'}
                  sku={item.productVariantId}
                  unitPrice={item.price ?? 0}
                  quantity={item.quantity}
                  onQuantityChange={(value) => updateQuantity(item.productVariantId, value)}
                  onRemove={() => removeItem(item.productVariantId)}
                />

            ))}
          </Stack>
        </GridCol>
        <GridCol span={{ base: 12, md: 4 }}>
          <OrderSummary total={total} itemCount={localItems.length} isAuthenticated={false} />
        </GridCol>
      </Grid>
    );
  };

  return (
    <>
      <StoreHeader />
      <main style={{ backgroundColor: '#fcf9f8', padding: '64px 16px 128px' }}>
        <Container size="xl" px={0}>
          <Title
            order={1}
            mb="xl"
            style={{ fontFamily: 'var(--font-bebas-neue)', fontSize: 'clamp(40px, 6vw, 72px)' }}
          >
            {t('cart.title')}
          </Title>
          {renderCart()}

          {crossSellConfig.enabled && crossSellProducts && crossSellProducts.length > 0 && (
            <div style={{ marginTop: 80 }}>
              <Title order={2} mb="xl" style={{ fontFamily: 'var(--font-bebas-neue)' }}>
                {crossSellConfig.title}
              </Title>
              <Grid gap="xl">
                {crossSellProducts.map((product) => (
                  <GridCol span={{ base: 12, sm: 6, lg: 3 }} key={product.id}>
                    <ProductCard product={product} />
                  </GridCol>
                ))}
              </Grid>
            </div>
          )}
        </Container>
      </main>
      <StoreFooter />
    </>
  );
}

function EmptyCart() {
  const { t } = useTranslation();
  return (
    <Stack gap="md" align="flex-start">
      <Text size="lg" c="dimmed">
        {t('cart.empty')}
      </Text>
      <Button
        component={Link}
        href="/catalogo"
        style={{
          backgroundColor: '#0d0d0d',
          color: '#fcf9f8',
          fontFamily: 'var(--font-bebas-neue)',
        }}
      >
        {t('cart.browse')}
      </Button>
    </Stack>
  );
}

interface CartItemRowProps {
  name: string;
  sku?: string | null;
  unitPrice: number;
  quantity: number;
  onQuantityChange: (value: number) => void;
  onRemove: () => void;
}

function CartItemRow({ name, sku, unitPrice, quantity, onQuantityChange, onRemove }: CartItemRowProps) {
  const { format } = useCurrency();
  return (
    <Group
      justify="space-between"
      wrap="nowrap"
      align="flex-start"
      style={{
        padding: '24px',
        border: '1px solid #0d0d0d',
      }}
    >
      <Stack gap={4}>
        <Text
          style={{
            fontFamily: 'var(--font-bebas-neue), Bebas Neue, Impact, sans-serif',
            fontSize: '24px',
            letterSpacing: '0.02em',
          }}
        >
          {name}
        </Text>
        {sku && (
          <Text size="xs" c="dimmed" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
            SKU: {sku}
          </Text>
        )}
        <Text size="sm" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
          {format(unitPrice)} c/u
        </Text>
      </Stack>
      <Group gap="md" align="center">
        <NumberInput
          value={quantity}
          onChange={(value) => onQuantityChange(Number(value) || 1)}
          min={1}
          max={10}
          style={{ width: 80 }}
          styles={{
            input: {
              border: '1px solid #0d0d0d',
              borderRadius: 0,
              textAlign: 'center',
            },
          }}
        />
        <Button variant="subtle" color="dark" onClick={onRemove} px="xs">
          <IconTrash size={18} />
        </Button>
      </Group>
    </Group>
  );
}

interface OrderSummaryProps {
  total: number;
  itemCount: number;
  isAuthenticated?: boolean;
}

function OrderSummary({ total, itemCount, isAuthenticated }: OrderSummaryProps) {
  const { format } = useCurrency();
  const { t } = useTranslation();
  const config = useStoreConfig();
  const storefront = parseStorefrontConfig(config.storefrontConfig);
  const { cart: cartConfig, featureFlags } = storefront;
  const freeShippingThreshold = config.freeShippingThreshold ?? 0;
  const progress = freeShippingThreshold > 0 ? Math.min(100, (total / freeShippingThreshold) * 100) : 0;
  const remaining = Math.max(0, freeShippingThreshold - total);
  return (
    <div
      style={{
        padding: '32px',
        border: '1px solid #0d0d0d',
        backgroundColor: '#f6f3f2',
      }}
    >
      <Stack gap="lg">
        <Text
          size="xs"
          style={{
            fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
          }}
        >
          {t('cart.orderSummary')}
        </Text>
        <Group justify="space-between">
          <Text c="dimmed">{t('cart.subtotal')} ({itemCount} items)</Text>
          <Text style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
            {format(total)}
          </Text>
        </Group>
        <Group justify="space-between">
          <Text c="dimmed">{t('cart.shipping')}</Text>
          <Text size="sm" c="dimmed">
            {t('cart.calculatedAtCheckout')}
          </Text>
        </Group>
        {cartConfig.showFreeShippingProgress && freeShippingThreshold > 0 && (
          <div>
            <div
              style={{
                height: 4,
                backgroundColor: '#e4e2e1',
                marginBottom: 8,
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: '100%',
                  backgroundColor: '#0d0d0d',
                }}
              />
            </div>
            <Text size="xs" c="dimmed">
              {remaining > 0
                ? `${t('cart.freeFrom')} ${format(remaining)} para envío gratis`
                : t('cart.freeShipping')}
            </Text>
          </div>
        )}
        <div style={{ borderTop: '1px solid #0d0d0d' }} />
        <Group justify="space-between">
          <Text
            size="xl"
            fw={700}
            style={{ fontFamily: 'var(--font-bebas-neue)', letterSpacing: '0.02em' }}
          >
            {t('cart.total')}
          </Text>
          <Text
            size="xl"
            fw={700}
            style={{ fontFamily: 'var(--font-jetbrains-mono)' }}
          >
            {format(total)}
          </Text>
        </Group>
        <Button
          component={Link}
          href="/checkout"
          fullWidth
          size="lg"
          rightSection={<IconArrowForward size={18} />}
          disabled={itemCount === 0}
          style={{
            backgroundColor: '#0d0d0d',
            color: '#fcf9f8',
            fontFamily: 'var(--font-bebas-neue)',
          }}
        >
          {t('cart.checkout')}
        </Button>
        {!isAuthenticated && itemCount > 0 && featureFlags.enableGuestCheckout && (
          <Button
            component={Link}
            href="/checkout/guest"
            fullWidth
            variant="outline"
            style={{
              borderColor: '#0d0d0d',
              color: '#0d0d0d',
              fontFamily: 'var(--font-bebas-neue)',
            }}
          >
            {t('cart.checkoutGuest')}
          </Button>
        )}
        {cartConfig.trustBadges.length > 0 && (
          <Group justify="center" gap="xs" wrap="wrap">
            {cartConfig.trustBadges.map((badge) => (
              <Text key={badge} size="xs" c="dimmed" style={{ fontFamily: 'var(--font-jetbrains-mono)' }}>
                ✓ {badge}
              </Text>
            ))}
          </Group>
        )}
      </Stack>
    </div>
  );
}
