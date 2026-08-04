'use client';

import { Badge, Burger, Button, Divider, Drawer, Group, Image, Select, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconHeart, IconShoppingCart, IconUser } from '@tabler/icons-react';

import { bebasNeue, jetbrainsMono } from '../lib/fonts';
import { parseStorefrontConfig } from '../lib/storefront-config';
import { useStoreConfig } from '../providers/config-provider';
import { useCurrency } from '../providers/currency-provider';
import { useTranslation } from '../providers/i18n-provider';
import { useAuthStore } from '../store/auth-store';
import { useCartStore } from '../store/cart-store';
import { LinkAnchor } from './link-anchor';
import { SearchAutocomplete } from './search-autocomplete';

export function StoreHeader() {
  const config = useStoreConfig();
  const storefrontConfig = parseStorefrontConfig(config.storefrontConfig);
  const headerVariant = config.templateConfig?.headerVariant ?? 'default';
  const [opened, { toggle, close }] = useDisclosure(false);
  const totalItems = useCartStore((state) => state.totalItems());
  const { isAuthenticated, logout } = useAuthStore();
  const { t } = useTranslation();

  const navLinks = storefrontConfig.navigation.length > 0
    ? storefrontConfig.navigation
    : [
        { href: '/catalogo', label: t('nav.collections'), newTab: false },
        ...(config.enableCustomDesigns !== false && storefrontConfig.featureFlags.enableCustomizer !== false ? [{ href: '/personalizar', label: t('nav.customize'), newTab: false }] : []),
        { href: '/', label: t('nav.about'), newTab: false },
      ];
  const logoUrl = storefrontConfig.branding.logoUrl || config.logoUrl;

  const linkStyle = {
    fontSize: '15px',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
  };

  const drawerItemStyle = {
    display: 'flex' as const,
    alignItems: 'center' as const,
    gap: '12px',
    fontSize: '24px',
    letterSpacing: '0.05em',
    textTransform: 'uppercase' as const,
  };

  return (
    <header
      className={bebasNeue.className}
      style={{
        borderBottom: '1px solid #0d0d0d',
        backgroundColor: '#fcf9f8',
        color: '#1b1c1c',
        position: 'sticky',
        top: 0,
        zIndex: 100,
      }}
    >
      <Group
        justify={headerVariant === 'centered' ? 'center' : 'space-between'}
        px={{ base: 16, md: 64 }}
        py="md"
        wrap="nowrap"
      >
        {headerVariant === 'centered' && <div />}

        {/* Logo */}
        <Group gap="sm">
          {logoUrl && (
            <Image src={logoUrl} alt={config.name} width={36} height={36} fit="contain" />
          )}
          <LinkAnchor
            href="/"
            underline="never"
            style={{
              fontSize: '28px',
              letterSpacing: '0.05em',
              color: '#1b1c1c',
            }}
          >
            {config.name}
          </LinkAnchor>
        </Group>

        {/* Desktop nav */}
        {headerVariant !== 'minimal' && (
          <Group gap="xl" visibleFrom="md" style={{ flex: headerVariant === 'centered' ? undefined : 1, justifyContent: 'center' }}>
            {navLinks.map((link) => (
              <LinkAnchor
                key={`${link.label}-${link.href}`}
                href={link.href}
                target={link.newTab ? '_blank' : undefined}
                rel={link.newTab ? 'noopener noreferrer' : undefined}
                underline="never"
                style={linkStyle}
              >
                {link.label}
              </LinkAnchor>
            ))}
          </Group>
        )}

        {/* Desktop actions */}
        <Group gap="lg" visibleFrom="md" wrap="nowrap" align="center">
          <SearchAutocomplete />

          <CurrencySelector />
          <LanguageSelector />

          {isAuthenticated && storefrontConfig.featureFlags.enableWishlist && (
            <LinkAnchor
              href="/wishlist"
              underline="never"
              aria-label="Favoritos"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                ...linkStyle,
              }}
            >
              <IconHeart size={18} stroke={1.5} aria-hidden="true" />
            </LinkAnchor>
          )}

          <LinkAnchor
            href="/cart"
            underline="never"
            aria-label={`Carrito${totalItems > 0 ? `, ${totalItems} items` : ''}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              ...linkStyle,
            }}
          >
            <IconShoppingCart size={18} stroke={1.5} aria-hidden="true" />
            {totalItems > 0 && (
              <Badge
                size="xs"
                color="dark"
                radius={0}
                className={jetbrainsMono.className}
                style={{ fontSize: '10px' }}
              >
                {totalItems}
              </Badge>
            )}
          </LinkAnchor>

          {isAuthenticated ? (
            <LinkAnchor
              href="/account"
              underline="never"
              aria-label="Mi cuenta"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                ...linkStyle,
              }}
            >
              <IconUser size={18} stroke={1.5} aria-hidden="true" />
            </LinkAnchor>
          ) : (
            <LinkAnchor href="/login" underline="never" style={linkStyle}>
              {t('nav.login')}
            </LinkAnchor>
          )}
        </Group>

        <Burger opened={opened} onClick={toggle} hiddenFrom="md" aria-label="Toggle menu" />
      </Group>

      <Drawer
        opened={opened}
        onClose={close}
        position="right"
        size="100%"
        padding="md"
        withCloseButton
        className={bebasNeue.className}
        styles={{
          content: {
            backgroundColor: '#fcf9f8',
            color: '#1b1c1c',
          },
        }}
      >
        <Stack gap="xl" mt="xl">
          {navLinks.map((link) => (
            <LinkAnchor
              key={`${link.label}-${link.href}`}
              href={link.href}
              target={link.newTab ? '_blank' : undefined}
              rel={link.newTab ? 'noopener noreferrer' : undefined}
              underline="never"
              onClick={link.newTab ? undefined : close}
              style={drawerItemStyle}
            >
              {link.label}
            </LinkAnchor>
          ))}

          <Divider color="#0d0d0d" />

          <LinkAnchor href="/cart" underline="never" onClick={close} style={drawerItemStyle}>
            <IconShoppingCart size={22} stroke={1.5} />
            {t('nav.cart')} {totalItems > 0 && <Badge size="xs">{totalItems}</Badge>}
          </LinkAnchor>

          {isAuthenticated ? (
            <>
              {storefrontConfig.featureFlags.enableWishlist && (
                <LinkAnchor href="/wishlist" underline="never" onClick={close} style={drawerItemStyle}>
                  <IconHeart size={22} stroke={1.5} />
                  {t('nav.wishlist')}
                </LinkAnchor>
              )}
              <LinkAnchor href="/orders" underline="never" onClick={close} style={drawerItemStyle}>
                {t('nav.orders')}
              </LinkAnchor>
              <LinkAnchor href="/account" underline="never" onClick={close} style={drawerItemStyle}>
                <IconUser size={22} stroke={1.5} />
                {t('nav.account')}
              </LinkAnchor>
              <Button
                variant="outline"
                onClick={() => {
                  logout();
                  close();
                }}
                fullWidth
              >
                {t('nav.logout')}
              </Button>
            </>
          ) : (
            <LinkAnchor href="/login" underline="never" onClick={close} style={drawerItemStyle}>
              {t('nav.login')}
            </LinkAnchor>
          )}
        </Stack>
      </Drawer>
    </header>
  );
}

function CurrencySelector() {
  const { currencies, selectedCurrency, setCurrencyCode, isLoading } = useCurrency();
  if (isLoading || currencies.length <= 1) return null;

  return (
    <Select
      value={selectedCurrency.code}
      onChange={(value) => value && setCurrencyCode(value)}
      data={currencies.map((c) => ({ value: c.code, label: `${c.code} (${c.symbol})` }))}
      size="xs"
      className={jetbrainsMono.className}
      styles={{
        input: {
          border: 'none',
          backgroundColor: 'transparent',
          fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
          letterSpacing: '0.05em',
          minWidth: 80,
        },
        dropdown: { borderRadius: 0, border: '1px solid #0d0d0d' },
        option: { fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace' },
      }}
      aria-label="Seleccionar moneda"
    />
  );
}

function LanguageSelector() {
  const { locale, setLocale } = useTranslation();
  return (
    <Select
      value={locale}
      onChange={(value) => value && setLocale(value as 'es' | 'en' | 'pt')}
      data={[
        { value: 'es', label: 'ES' },
        { value: 'en', label: 'EN' },
        { value: 'pt', label: 'PT' },
      ]}
      size="xs"
      className={jetbrainsMono.className}
      styles={{
        input: {
          border: 'none',
          backgroundColor: 'transparent',
          fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
          letterSpacing: '0.05em',
          minWidth: 60,
        },
        dropdown: { borderRadius: 0, border: '1px solid #0d0d0d' },
        option: { fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace' },
      }}
      aria-label="Seleccionar idioma"
    />
  );
}
