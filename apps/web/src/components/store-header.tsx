'use client';

import { Badge, Burger, Button, Container, Divider, Drawer, Group, Select, Stack } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { IconArrowRight, IconHeart, IconShoppingCart, IconUser } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';

import { apiClient, logoutSession } from '../lib/api';
import { bebasNeue, jetbrainsMono } from '../lib/fonts';
import { parseStorefrontConfig } from '../lib/storefront-config';
import { useStoreConfig } from '../providers/config-provider';
import { useCurrency } from '../providers/currency-provider';
import { useTranslation } from '../providers/i18n-provider';
import { useAuthStore } from '../store/auth-store';
import { useCartStore } from '../store/cart-store';
import { BrandLogo } from './brand-logo';
import { LinkAnchor } from './link-anchor';
import { SearchAutocomplete } from './search-autocomplete';

export function StoreHeader() {
  const config = useStoreConfig();
  const storefrontConfig = parseStorefrontConfig(config.storefrontConfig);
  const headerVariant = config.templateConfig?.headerVariant ?? 'default';
  const [opened, { toggle, close }] = useDisclosure(false);
  // Evita el mismatch de hidratación: el conteo del carrito y el estado de sesión
  // solo se pintan después del primer render en el cliente.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const localCount = useCartStore((state) => state.totalItems());
  const { isAuthenticated, sessionReady } = useAuthStore();
  const { t } = useTranslation();

  // Con sesión, el contador sale del carrito del servidor (comparte cache con /cart).
  const { data: serverCart } = useQuery({
    queryKey: ['cart'],
    enabled: mounted && isAuthenticated,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await apiClient.GET('/cart');
      if (error) throw error;
      return data;
    },
  });
  const totalItems = !mounted
    ? 0
    : isAuthenticated
      ? (serverCart?.items ?? []).reduce((sum, item) => sum + item.quantity, 0)
      : localCount;

  const navLinks = storefrontConfig.navigation.length > 0
    ? storefrontConfig.navigation
    : [
        { href: '/catalogo', label: t('nav.collections'), newTab: false },
        ...(config.enableCustomDesigns !== false && storefrontConfig.featureFlags.enableCustomizer !== false ? [{ href: '/personalizar', label: t('nav.customize'), newTab: false }] : []),
        { href: '/', label: t('nav.about'), newTab: false },
      ];

  // Categorías para el mega menú de "Catálogo" (hover, pantalla completa).
  const { data: headerCategories } = useQuery({
    queryKey: ['header-categories'],
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data } = await apiClient.GET('/catalog/categories');
      return (data ?? []) as Array<{ id: string; name: string; slug: string; parentId?: string | null }>;
    },
  });

  const catalogSections = useMemo(() => {
    const categories = headerCategories ?? [];
    return categories
      .filter((category) => !category.parentId)
      .map((root) => ({
        ...root,
        children: categories.filter((category) => category.parentId === root.id),
      }));
  }, [headerCategories]);

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

        {/* Logo (cuando hay imagen se muestra sola; el nombre es fallback) */}
        <BrandLogo size={44} />

        {/* Desktop nav */}
        {headerVariant !== 'minimal' && (
          <Group gap="xl" visibleFrom="md" style={{ flex: headerVariant === 'centered' ? undefined : 1, justifyContent: 'center' }}>
            {navLinks.map((link) =>
              link.href === '/catalogo' ? (
                <CatalogMegaMenu
                  key={`${link.label}-${link.href}`}
                  label={link.label}
                  sections={catalogSections}
                  linkStyle={linkStyle}
                  promo={storefrontConfig.promoBanner}
                />
              ) : (
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
              ),
            )}
          </Group>
        )}

        {/* Desktop actions */}
        <Group gap="lg" visibleFrom="md" wrap="nowrap" align="center">
          <SearchAutocomplete />

          <CurrencySelector />
          <LanguageSelector />

          {mounted && sessionReady && isAuthenticated && storefrontConfig.featureFlags.enableWishlist && (
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
            data-cart-target
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
                className={`nova-cart-badge ${jetbrainsMono.className}`}
                style={{ fontSize: '10px' }}
              >
                {totalItems}
              </Badge>
            )}
          </LinkAnchor>

          {mounted && !sessionReady ? null : mounted && isAuthenticated ? (
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

          {catalogSections.length > 0 && (
            <Stack gap="md">
              {catalogSections.map((section) => (
                <Stack key={section.id} gap={6}>
                  <LinkAnchor
                    href={`/catalogo?category=${section.slug}`}
                    underline="never"
                    onClick={close}
                    style={{ ...drawerItemStyle, fontSize: 20 }}
                  >
                    {section.name}
                  </LinkAnchor>
                  {section.children.map((child) => (
                    <LinkAnchor
                      key={child.id}
                      href={`/catalogo?category=${child.slug}`}
                      underline="never"
                      onClick={close}
                      style={{ ...drawerItemStyle, fontSize: 13, paddingLeft: 16, color: '#5f5f58' }}
                    >
                      {child.name}
                    </LinkAnchor>
                  ))}
                </Stack>
              ))}
            </Stack>
          )}

          <Divider color="#0d0d0d" />

          <LinkAnchor href="/cart" underline="never" onClick={close} style={drawerItemStyle}>
            <IconShoppingCart size={22} stroke={1.5} />
            {t('nav.cart')} {totalItems > 0 && <Badge size="xs">{totalItems}</Badge>}
          </LinkAnchor>

          {mounted && !sessionReady ? null : mounted && isAuthenticated ? (
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
                  void logoutSession();
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

interface HeaderCategory {
  id: string;
  name: string;
  slug: string;
  parentId?: string | null;
}

interface HeaderCategorySection extends HeaderCategory {
  children: HeaderCategory[];
}

interface HeaderPromo {
  enabled: boolean;
  title: string;
  subtitle: string;
  link: string;
  backgroundColor: string;
  textColor: string;
}

/** Link "Catálogo" con mega menú a pantalla completa (hover) dividido en secciones y subsecciones. */
function CatalogMegaMenu({
  label,
  sections,
  linkStyle,
  promo,
}: {
  label: string;
  sections: HeaderCategorySection[];
  linkStyle: CSSProperties;
  promo: HeaderPromo;
}) {
  const [open, setOpen] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const openMenu = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(true);
  };

  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 160);
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  if (sections.length === 0) {
    return (
      <LinkAnchor href="/catalogo" underline="never" style={linkStyle}>
        {label}
      </LinkAnchor>
    );
  }

  return (
    <div onMouseEnter={openMenu} onMouseLeave={scheduleClose} style={{ display: 'inline-flex' }}>
      <LinkAnchor
        href="/catalogo"
        underline="never"
        style={linkStyle}
        aria-haspopup="true"
        aria-expanded={open}
      >
        {label}
      </LinkAnchor>

      {open && (
        <div
          className="mega-panel"
          role="navigation"
          aria-label="Categorías del catálogo"
          onClick={() => setOpen(false)}
        >
          <Container fluid px={{ base: 16, md: 64 }}>
            <div className="mega-grid">
              {sections.map((section) => (
                <div key={section.id}>
                  <Link className="mega-section-title" href={`/catalogo?category=${section.slug}`}>
                    {section.name}
                  </Link>
                  {section.children.length > 0 && (
                    <ul className="mega-links">
                      {section.children.map((child) => (
                        <li key={child.id}>
                          <Link className="mega-link" href={`/catalogo?category=${child.slug}`}>
                            {child.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}

              {promo.enabled && (
                <div
                  className="mega-promo"
                  style={{ backgroundColor: promo.backgroundColor, color: promo.textColor }}
                >
                  <div>
                    <span className="mega-promo-title">{promo.title}</span>
                    <p className="mega-promo-subtitle">{promo.subtitle}</p>
                  </div>
                  <Link className="mega-promo-link" href={promo.link}>
                    Ver más
                  </Link>
                </div>
              )}
            </div>

            <div className="mega-footer">
              <Link className="mega-all" href="/catalogo">
                Ver todo el catálogo
                <IconArrowRight size={16} aria-hidden="true" />
              </Link>
            </div>
          </Container>
        </div>
      )}
    </div>
  );
}
