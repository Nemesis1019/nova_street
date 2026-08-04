'use client';

import { type StorefrontConfig } from '@ecommerce/shared';
import { Button, ColorInput, Divider, Group, NumberInput, Select, Stack, Switch, Textarea, TextInput, Title } from '@mantine/core';
import { type UseFormReturnType } from '@mantine/form';

interface StorefrontConfigFormValues {
  storefrontConfig: StorefrontConfig;
}

const HOME_SECTIONS: Array<{ value: StorefrontConfig['homeSections'][number]; label: string }> = [
  { value: 'hero', label: 'Hero principal' },
  { value: 'categories', label: 'Categorías destacadas' },
  { value: 'featuredProducts', label: 'Productos destacados' },
  { value: 'promoBanner', label: 'Banner promocional' },
  { value: 'newsletter', label: 'Newsletter' },
  { value: 'identity', label: 'Sección de identidad/marca' },
];

export function StorefrontConfigSection({
  form,
}: {
  form: UseFormReturnType<StorefrontConfigFormValues>;
}) {
  const cfg = form.values.storefrontConfig;

  const setSection = (path: string, value: unknown) => {
    form.setFieldValue(path as `storefrontConfig.${string}`, value);
  };

  const toggleHomeSection = (value: StorefrontConfig['homeSections'][number]) => {
    const current = cfg.homeSections;
    if (current.includes(value)) {
      setSection('storefrontConfig.homeSections', current.filter((s) => s !== value));
    } else {
      setSection('storefrontConfig.homeSections', [...current, value]);
    }
  };

  const moveHomeSection = (index: number, direction: -1 | 1) => {
    const current = [...cfg.homeSections];
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= current.length) return;
    const [moved] = current.splice(index, 1);
    current.splice(newIndex, 0, moved);
    setSection('storefrontConfig.homeSections', current);
  };

  const addFooterLink = () => {
    const links = [...cfg.footer.extraLinks, { label: '', href: '' }];
    setSection('storefrontConfig.footer.extraLinks', links);
  };

  const updateFooterLink = (index: number, key: 'label' | 'href', value: string) => {
    const links = [...cfg.footer.extraLinks];
    links[index] = { ...links[index], [key]: value };
    setSection('storefrontConfig.footer.extraLinks', links);
  };

  const removeFooterLink = (index: number) => {
    const links = cfg.footer.extraLinks.filter((_, i) => i !== index);
    setSection('storefrontConfig.footer.extraLinks', links);
  };

  const addNavLink = () => {
    const links = [...cfg.navigation, { label: '', href: '', newTab: false }];
    setSection('storefrontConfig.navigation', links);
  };

  const updateNavLink = (index: number, key: 'label' | 'href' | 'newTab', value: string | boolean) => {
    const links = [...cfg.navigation];
    links[index] = { ...links[index], [key]: value };
    setSection('storefrontConfig.navigation', links);
  };

  const removeNavLink = (index: number) => {
    const links = cfg.navigation.filter((_, i) => i !== index);
    setSection('storefrontConfig.navigation', links);
  };

  return (
    <>
      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        Anuncios / barra superior
      </Title>
      <Switch
        label="Habilitar barra de anuncios"
        {...form.getInputProps('storefrontConfig.announcementBar.enabled', { type: 'checkbox' })}
      />
      {cfg.announcementBar.enabled && (
        <>
          <TextInput label="Texto" {...form.getInputProps('storefrontConfig.announcementBar.text')} />
          <TextInput label="Link (opcional)" {...form.getInputProps('storefrontConfig.announcementBar.link')} />
          <ColorInput label="Color de fondo" {...form.getInputProps('storefrontConfig.announcementBar.backgroundColor')} />
          <ColorInput label="Color de texto" {...form.getInputProps('storefrontConfig.announcementBar.textColor')} />
        </>
      )}

      <Divider />

      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        Menú de navegación
      </Title>
      {cfg.navigation.map((link, index) => (
        <Group key={index} align="flex-end">
          <TextInput
            label="Etiqueta"
            value={link.label}
            onChange={(e) => updateNavLink(index, 'label', e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <TextInput
            label="URL"
            value={link.href}
            onChange={(e) => updateNavLink(index, 'href', e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Switch
            label="Nueva pestaña"
            checked={link.newTab}
            onChange={(e) => updateNavLink(index, 'newTab', e.currentTarget.checked)}
          />
          <Button variant="subtle" color="red" onClick={() => removeNavLink(index)}>
            Eliminar
          </Button>
        </Group>
      ))}
      <Button variant="light" onClick={addNavLink}>
        Agregar enlace
      </Button>

      <Divider />

      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        Constructor de home
      </Title>
      <Stack gap="xs">
        {HOME_SECTIONS.map((section) => {
          const index = cfg.homeSections.indexOf(section.value);
          const active = index >= 0;
          return (
            <Group key={section.value} justify="space-between">
              <Switch
                label={section.label}
                checked={active}
                onChange={() => toggleHomeSection(section.value)}
              />
              {active && (
                <Group gap="xs">
                  <Button variant="subtle" size="xs" onClick={() => moveHomeSection(index, -1)} disabled={index === 0}>
                    ↑
                  </Button>
                  <Button variant="subtle" size="xs" onClick={() => moveHomeSection(index, 1)} disabled={index === cfg.homeSections.length - 1}>
                    ↓
                  </Button>
                </Group>
              )}
            </Group>
          );
        })}
      </Stack>

      <Divider />

      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        Banner promocional
      </Title>
      <Switch
        label="Habilitar banner promocional"
        {...form.getInputProps('storefrontConfig.promoBanner.enabled', { type: 'checkbox' })}
      />
      {cfg.promoBanner.enabled && (
        <>
          <TextInput label="Título" {...form.getInputProps('storefrontConfig.promoBanner.title')} />
          <TextInput label="Subtítulo" {...form.getInputProps('storefrontConfig.promoBanner.subtitle')} />
          <TextInput label="Link" {...form.getInputProps('storefrontConfig.promoBanner.link')} />
          <ColorInput label="Color de fondo" {...form.getInputProps('storefrontConfig.promoBanner.backgroundColor')} />
          <ColorInput label="Color de texto" {...form.getInputProps('storefrontConfig.promoBanner.textColor')} />
        </>
      )}

      <Divider />

      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        Footer
      </Title>
      <Switch
        label="Mostrar newsletter en footer"
        {...form.getInputProps('storefrontConfig.footer.showNewsletter', { type: 'checkbox' })}
      />
      <Switch
        label="Mostrar redes sociales en footer"
        {...form.getInputProps('storefrontConfig.footer.showSocialLinks', { type: 'checkbox' })}
      />
      <TextInput label="Texto de copyright" {...form.getInputProps('storefrontConfig.footer.copyrightText')} />
      <Title order={6}>Links adicionales</Title>
      {cfg.footer.extraLinks.map((link, index) => (
        <Group key={index} align="flex-end">
          <TextInput
            label="Etiqueta"
            value={link.label}
            onChange={(e) => updateFooterLink(index, 'label', e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <TextInput
            label="URL"
            value={link.href}
            onChange={(e) => updateFooterLink(index, 'href', e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Button variant="subtle" color="red" onClick={() => removeFooterLink(index)}>
            Eliminar
          </Button>
        </Group>
      ))}
      <Button variant="light" onClick={addFooterLink}>
        Agregar link
      </Button>

      <Divider />

      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        Tarjeta de producto
      </Title>
      <Switch label="Mostrar SKU" {...form.getInputProps('storefrontConfig.productCard.showSku', { type: 'checkbox' })} />
      <Switch label="Mostrar rating" {...form.getInputProps('storefrontConfig.productCard.showRating', { type: 'checkbox' })} />
      <Switch label="Mostrar badge de stock" {...form.getInputProps('storefrontConfig.productCard.showStockBadge', { type: 'checkbox' })} />
      <Switch label="Mostrar favoritos" {...form.getInputProps('storefrontConfig.productCard.showWishlist', { type: 'checkbox' })} />
      <Switch label="Mostrar vista rápida" {...form.getInputProps('storefrontConfig.productCard.showQuickView', { type: 'checkbox' })} />

      <Divider />

      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        Badges de producto
      </Title>
      <Switch label="Badge Nuevo" {...form.getInputProps('storefrontConfig.productBadges.showNew', { type: 'checkbox' })} />
      <Switch label="Badge Oferta" {...form.getInputProps('storefrontConfig.productBadges.showSale', { type: 'checkbox' })} />
      <Switch label="Badge Pocas unidades" {...form.getInputProps('storefrontConfig.productBadges.showLowStock', { type: 'checkbox' })} />
      <NumberInput label="Umbral de pocas unidades" min={0} {...form.getInputProps('storefrontConfig.productBadges.lowStockThreshold')} />
      <NumberInput label="Días para considerar un producto Nuevo" min={0} {...form.getInputProps('storefrontConfig.productBadges.newDaysThreshold')} />

      <Divider />

      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        Catálogo
      </Title>
      <Select
        label="Ordenamiento por defecto"
        data={[
          { value: 'newest', label: 'Más recientes' },
          { value: 'priceAsc', label: 'Precio: menor a mayor' },
          { value: 'priceDesc', label: 'Precio: mayor a menor' },
          { value: 'nameAsc', label: 'Nombre A-Z' },
          { value: 'bestSelling', label: 'Más vendidos' },
        ]}
        {...form.getInputProps('storefrontConfig.catalog.defaultSort')}
      />
      <NumberInput label="Productos por página por defecto" min={1} max={96} {...form.getInputProps('storefrontConfig.catalog.defaultPageSize')} />
      <Switch label="Mostrar filtros" {...form.getInputProps('storefrontConfig.catalog.showFilters', { type: 'checkbox' })} />

      <Divider />

      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        Productos relacionados / cross-sell
      </Title>
      <Switch label="Habilitar productos relacionados" {...form.getInputProps('storefrontConfig.relatedProducts.enabled', { type: 'checkbox' })} />
      <Select
        label="Estrategia"
        data={[
          { value: 'sameCategory', label: 'Misma categoría' },
          { value: 'sameCollection', label: 'Misma colección' },
          { value: 'none', label: 'Sin automáticos' },
        ]}
        {...form.getInputProps('storefrontConfig.relatedProducts.strategy')}
      />
      <NumberInput label="Cantidad máxima" min={0} max={12} {...form.getInputProps('storefrontConfig.relatedProducts.limit')} />

      <Divider />

      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        Carrito
      </Title>
      <TextInput label="Badges de confianza (separados por coma)" {...form.getInputProps('storefrontConfig.cart.trustBadges')} value={cfg.cart.trustBadges.join(', ')} onChange={(e) => setSection('storefrontConfig.cart.trustBadges', e.currentTarget.value.split(',').map((s) => s.trim()).filter(Boolean))} />
      <Switch label="Mostrar barra de progreso de envío gratis" {...form.getInputProps('storefrontConfig.cart.showFreeShippingProgress', { type: 'checkbox' })} />

      <Divider />

      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        Checkout
      </Title>
      <Switch label="Teléfono obligatorio" {...form.getInputProps('storefrontConfig.checkout.requirePhone', { type: 'checkbox' })} />
      <Switch label="Mostrar campo de empresa" {...form.getInputProps('storefrontConfig.checkout.showCompanyField', { type: 'checkbox' })} />
      <Switch label="Mostrar campo de notas del pedido" {...form.getInputProps('storefrontConfig.checkout.showOrderNotes', { type: 'checkbox' })} />
      <TextInput label="Mensaje de agradecimiento" {...form.getInputProps('storefrontConfig.checkout.thankYouMessage')} />

      <Divider />

      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        Cross-sell / upsell
      </Title>
      <Switch label="Habilitar cross-sell" {...form.getInputProps('storefrontConfig.crossSell.enabled', { type: 'checkbox' })} />
      {cfg.crossSell.enabled && (
        <>
          <TextInput label="Título" {...form.getInputProps('storefrontConfig.crossSell.title')} />
          <Select
            label="Estrategia"
            data={[
              { value: 'sameCategory', label: 'Misma categoría' },
              { value: 'bestSelling', label: 'Más vendidos' },
              { value: 'none', label: 'Sin automáticos' },
            ]}
            {...form.getInputProps('storefrontConfig.crossSell.strategy')}
          />
          <NumberInput label="Cantidad máxima" min={0} max={12} {...form.getInputProps('storefrontConfig.crossSell.limit')} />
        </>
      )}

      <Divider />

      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        Feature flags
      </Title>
      <Switch label="Habilitar wishlist" {...form.getInputProps('storefrontConfig.featureFlags.enableWishlist', { type: 'checkbox' })} />
      <Switch label="Habilitar comparador" {...form.getInputProps('storefrontConfig.featureFlags.enableCompare', { type: 'checkbox' })} />
      <Switch label="Habilitar reseñas" {...form.getInputProps('storefrontConfig.featureFlags.enableReviews', { type: 'checkbox' })} />
      <Switch label="Habilitar personalizador" {...form.getInputProps('storefrontConfig.featureFlags.enableCustomizer', { type: 'checkbox' })} />
      <Switch label="Habilitar checkout de invitado" {...form.getInputProps('storefrontConfig.featureFlags.enableGuestCheckout', { type: 'checkbox' })} />
      <Switch label="Habilitar vista rápida" {...form.getInputProps('storefrontConfig.featureFlags.enableQuickView', { type: 'checkbox' })} />

      <Divider />

      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        Branding avanzado
      </Title>
      <TextInput label="URL del logo" {...form.getInputProps('storefrontConfig.branding.logoUrl')} />
      <Textarea label="CSS personalizado" {...form.getInputProps('storefrontConfig.branding.customCss')} minRows={4} />
    </>
  );
}
