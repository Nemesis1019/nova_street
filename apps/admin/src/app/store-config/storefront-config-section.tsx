'use client';

import { type StorefrontConfig } from '@ecommerce/shared';
import { Button, ColorInput, Divider, Group, NumberInput, Select, Stack, Switch, Textarea, TextInput, Title } from '@mantine/core';
import { type UseFormReturnType } from '@mantine/form';
import { useQuery } from '@tanstack/react-query';

import { Reveal } from '../../components/ui/motion';
import { apiClient } from '../../lib/api';
import { useTranslation } from '../../providers/i18n-provider';

interface StorefrontConfigFormValues {
  storefrontConfig: StorefrontConfig;
}

const HOME_SECTIONS: Array<{ value: StorefrontConfig['homeSections'][number]; labelKey: string }> = [
  { value: 'hero', labelKey: 'pages.storeConfig.homeHero' },
  { value: 'collectionShowcase', labelKey: 'pages.storeConfig.homeCollectionShowcase' },
  { value: 'categories', labelKey: 'pages.storeConfig.homeCategories' },
  { value: 'featuredProducts', labelKey: 'pages.storeConfig.homeFeaturedProducts' },
  { value: 'promoBanner', labelKey: 'pages.storeConfig.sectionPromoBanner' },
  { value: 'countdown', labelKey: 'pages.storeConfig.countdownDrop' },
  { value: 'newsletter', labelKey: 'pages.storeConfig.homeNewsletter' },
  { value: 'productSpotlight', labelKey: 'pages.storeConfig.homeProductSpotlight' },
];

export function StorefrontConfigSection({
  form,
}: {
  form: UseFormReturnType<StorefrontConfigFormValues>;
}) {
  const { t } = useTranslation();
  const cfg = form.values.storefrontConfig;

  const { data: categories } = useQuery({
    queryKey: ['store-config-categories'],
    queryFn: async () => {
      const { data } = await apiClient.GET('/catalog/categories');
      return (data ?? []) as Array<{ id: string; name: string; slug: string }>;
    },
  });

  const { data: products } = useQuery({
    queryKey: ['store-config-products'],
    queryFn: async () => {
      const { data } = await apiClient.GET('/catalog/products', { params: { query: { limit: 100 } } });
      return (data?.data ?? []) as Array<{ id: string; name: string; slug: string }>;
    },
  });

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

  const addExternalScript = () => {
    const scripts = [
      ...cfg.externalScripts,
      { id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2), name: '', placement: 'head' as const, code: '' },
    ];
    setSection('storefrontConfig.externalScripts', scripts);
  };

  const updateExternalScript = (index: number, key: 'name' | 'placement' | 'code', value: string) => {
    const scripts = [...cfg.externalScripts];
    scripts[index] = { ...scripts[index], [key]: value };
    setSection('storefrontConfig.externalScripts', scripts);
  };

  const removeExternalScript = (index: number) => {
    const scripts = cfg.externalScripts.filter((_, i) => i !== index);
    setSection('storefrontConfig.externalScripts', scripts);
  };

  const addPopup = () => {
    const popups = [
      ...cfg.popups,
      {
        id: crypto.randomUUID?.() ?? Math.random().toString(36).slice(2),
        name: '',
        enabled: true,
        trigger: 'immediate' as const,
        delaySeconds: 0,
        scrollPercent: 50,
        title: '',
        content: '',
        buttonText: '',
        buttonLink: '',
        backgroundColor: '#ffffff',
        textColor: '#0d0d0d',
        showOnce: true,
      },
    ];
    setSection('storefrontConfig.popups', popups);
  };

  const updatePopup = (index: number, key: keyof typeof cfg.popups[number], value: unknown) => {
    const popups = [...cfg.popups];
    popups[index] = { ...popups[index], [key]: value };
    setSection('storefrontConfig.popups', popups);
  };

  const removePopup = (index: number) => {
    const popups = cfg.popups.filter((_, i) => i !== index);
    setSection('storefrontConfig.popups', popups);
  };

  return (
    <>
      <Reveal className="flex flex-col gap-5">
      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        {t('pages.storeConfig.sectionAnnouncements')}
      </Title>
      <Switch
        label={t('pages.storeConfig.enableAnnouncementBar')}
        {...form.getInputProps('storefrontConfig.announcementBar.enabled', { type: 'checkbox' })}
      />
      {cfg.announcementBar.enabled && (
        <>
          <TextInput label={t('pages.storeConfig.labelText')} {...form.getInputProps('storefrontConfig.announcementBar.text')} />
          <TextInput label={t('pages.storeConfig.labelLinkOptional')} {...form.getInputProps('storefrontConfig.announcementBar.link')} />
          <ColorInput label={t('pages.storeConfig.labelBackgroundColor')} {...form.getInputProps('storefrontConfig.announcementBar.backgroundColor')} />
          <ColorInput label={t('pages.storeConfig.labelTextColor')} {...form.getInputProps('storefrontConfig.announcementBar.textColor')} />
          <TextInput
            label={t('pages.storeConfig.visibleFrom')}
            type="datetime-local"
            {...form.getInputProps('storefrontConfig.announcementBar.startsAt')}
          />
          <TextInput
            label={t('pages.storeConfig.visibleUntil')}
            type="datetime-local"
            {...form.getInputProps('storefrontConfig.announcementBar.endsAt')}
          />
        </>
      )}

      </Reveal>

      <Divider />

      <Reveal className="flex flex-col gap-5">
      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        {t('pages.storeConfig.navigationMenu')}
      </Title>
      {cfg.navigation.map((link, index) => (
        <Group key={index} align="flex-end">
          <TextInput
            label={t('pages.storeConfig.labelTag')}
            value={link.label}
            onChange={(e) => updateNavLink(index, 'label', e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <TextInput
            label={t('pages.storeConfig.labelUrl')}
            value={link.href}
            onChange={(e) => updateNavLink(index, 'href', e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Switch
            label={t('pages.storeConfig.newTab')}
            checked={link.newTab}
            onChange={(e) => updateNavLink(index, 'newTab', e.currentTarget.checked)}
          />
          <Button variant="subtle" color="red" onClick={() => removeNavLink(index)}>
            {t('common.delete')}
          </Button>
        </Group>
      ))}
      <Button variant="light" onClick={addNavLink}>
        {t('pages.storeConfig.addLink')}
      </Button>

      </Reveal>

      <Divider />

      <Reveal className="flex flex-col gap-5">
      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        {t('pages.storeConfig.homeBuilder')}
      </Title>
      <Stack gap="xs">
        {HOME_SECTIONS.map((section) => {
          const index = cfg.homeSections.indexOf(section.value);
          const active = index >= 0;
          return (
            <Group key={section.value} justify="space-between">
              <Switch
                label={t(section.labelKey)}
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

      </Reveal>

      <Divider />

      <Reveal className="flex flex-col gap-5">
      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        {t('pages.storeConfig.sectionPromoBanner')}
      </Title>
      <Switch
        label={t('pages.storeConfig.enablePromoBanner')}
        {...form.getInputProps('storefrontConfig.promoBanner.enabled', { type: 'checkbox' })}
      />
      {cfg.promoBanner.enabled && (
        <>
          <TextInput label={t('pages.storeConfig.labelTitle')} {...form.getInputProps('storefrontConfig.promoBanner.title')} />
          <TextInput label={t('pages.storeConfig.labelSubtitle')} {...form.getInputProps('storefrontConfig.promoBanner.subtitle')} />
          <TextInput label={t('pages.storeConfig.labelLink')} {...form.getInputProps('storefrontConfig.promoBanner.link')} />
          <ColorInput label={t('pages.storeConfig.labelBackgroundColor')} {...form.getInputProps('storefrontConfig.promoBanner.backgroundColor')} />
          <ColorInput label={t('pages.storeConfig.labelTextColor')} {...form.getInputProps('storefrontConfig.promoBanner.textColor')} />
        </>
      )}

      </Reveal>

      <Divider />

      <Reveal className="flex flex-col gap-5">
      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        {t('pages.storeConfig.featuredProductsHome')}
      </Title>
      <TextInput label={t('pages.storeConfig.sectionTitleLabel')} {...form.getInputProps('storefrontConfig.featuredProducts.title')} />
      <Select
        label={t('pages.storeConfig.filterByCategory')}
        placeholder={t('pages.storeConfig.allCategories')}
        clearable
        searchable
        data={(categories ?? []).map((category) => ({ value: category.slug, label: category.name }))}
        {...form.getInputProps('storefrontConfig.featuredProducts.categorySlug')}
      />
      <NumberInput
        label={t('pages.storeConfig.productsCount')}
        min={1}
        max={24}
        {...form.getInputProps('storefrontConfig.featuredProducts.limit')}
      />
      <Group grow>
        <NumberInput
          label={t('pages.storeConfig.featuredColumns')}
          min={2}
          max={6}
          {...form.getInputProps('storefrontConfig.featuredProducts.columns')}
        />
        <Select
          label={t('pages.storeConfig.featuredSort')}
          data={[
            { value: 'newest', label: t('pages.storeConfig.sortNewest') },
            { value: 'price_asc', label: t('pages.storeConfig.sortPriceAsc') },
            { value: 'price_desc', label: t('pages.storeConfig.sortPriceDesc') },
            { value: 'name_asc', label: t('pages.storeConfig.sortNameAsc') },
          ]}
          {...form.getInputProps('storefrontConfig.featuredProducts.sort')}
        />
      </Group>

      </Reveal>

      <Divider />

      <Reveal className="flex flex-col gap-5">
      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        {t('pages.storeConfig.homeProductSpotlight')}
      </Title>
      <TextInput
        label={t('pages.storeConfig.spotlightEyebrow')}
        {...form.getInputProps('storefrontConfig.productSpotlight.eyebrow')}
      />
      <Select
        label={t('pages.storeConfig.spotlightProduct')}
        placeholder={t('pages.storeConfig.spotlightProductPlaceholder')}
        clearable
        searchable
        data={(products ?? []).map((product) => ({ value: product.slug, label: product.name }))}
        {...form.getInputProps('storefrontConfig.productSpotlight.productSlug')}
      />
      <TextInput
        label={t('pages.storeConfig.spotlightTitle')}
        {...form.getInputProps('storefrontConfig.productSpotlight.title')}
      />
      <Textarea
        label={t('pages.storeConfig.spotlightText')}
        autosize
        minRows={2}
        {...form.getInputProps('storefrontConfig.productSpotlight.text')}
      />
      <Group grow>
        <TextInput
          label={t('pages.storeConfig.spotlightCta')}
          {...form.getInputProps('storefrontConfig.productSpotlight.ctaLabel')}
        />
        <Select
          label={t('pages.storeConfig.spotlightImagePosition')}
          data={[
            { value: 'right', label: t('pages.storeConfig.spotlightImageRight') },
            { value: 'left', label: t('pages.storeConfig.spotlightImageLeft') },
          ]}
          {...form.getInputProps('storefrontConfig.productSpotlight.imagePosition')}
        />
      </Group>
      <Switch
        label={t('pages.storeConfig.spotlightShowPrice')}
        {...form.getInputProps('storefrontConfig.productSpotlight.showPrice', { type: 'checkbox' })}
      />

      </Reveal>

      <Divider />

      <Reveal className="flex flex-col gap-5">
      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        {t('pages.storeConfig.homeCollectionShowcase')}
      </Title>
      <TextInput
        label={t('pages.storeConfig.sectionTitleLabel')}
        {...form.getInputProps('storefrontConfig.collectionShowcase.title')}
      />
      <Group grow>
        <TextInput
          label={t('pages.storeConfig.showcaseLinkLabel')}
          {...form.getInputProps('storefrontConfig.collectionShowcase.linkLabel')}
        />
        <TextInput
          label={t('pages.storeConfig.showcaseLinkHref')}
          {...form.getInputProps('storefrontConfig.collectionShowcase.linkHref')}
        />
      </Group>
      <Select
        label={t('pages.storeConfig.filterByCategory')}
        placeholder={t('pages.storeConfig.allCategories')}
        clearable
        searchable
        data={(categories ?? []).map((category) => ({ value: category.slug, label: category.name }))}
        {...form.getInputProps('storefrontConfig.collectionShowcase.categorySlug')}
      />
      <Switch
        label={t('pages.storeConfig.showcaseStoryEnabled')}
        {...form.getInputProps('storefrontConfig.collectionShowcase.story.enabled', { type: 'checkbox' })}
      />
      {cfg.collectionShowcase.story.enabled && (
        <>
          <TextInput
            label={t('pages.storeConfig.showcaseStoryTitle')}
            {...form.getInputProps('storefrontConfig.collectionShowcase.story.title')}
          />
          <Textarea
            label={t('pages.storeConfig.showcaseStoryText')}
            autosize
            minRows={2}
            {...form.getInputProps('storefrontConfig.collectionShowcase.story.text')}
          />
          <Group grow>
            <TextInput
              label={t('pages.storeConfig.showcaseStoryLinkLabel')}
              {...form.getInputProps('storefrontConfig.collectionShowcase.story.linkLabel')}
            />
            <TextInput
              label={t('pages.storeConfig.showcaseStoryLinkHref')}
              {...form.getInputProps('storefrontConfig.collectionShowcase.story.linkHref')}
            />
          </Group>
        </>
      )}

      </Reveal>

      <Divider />

      <Reveal className="flex flex-col gap-5">
      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        {t('pages.storeConfig.countdownDrop')}
      </Title>
      <Switch
        label={t('pages.storeConfig.enableCountdown')}
        {...form.getInputProps('storefrontConfig.countdown.enabled', { type: 'checkbox' })}
      />
      {cfg.countdown.enabled && (
        <>
          <TextInput label={t('pages.storeConfig.labelTitle')} {...form.getInputProps('storefrontConfig.countdown.title')} />
          <TextInput
            label={t('pages.storeConfig.targetDateTime')}
            type="datetime-local"
            required
            {...form.getInputProps('storefrontConfig.countdown.targetAt')}
          />
        </>
      )}

      </Reveal>

      <Divider />

      <Reveal className="flex flex-col gap-5">
      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        {t('pages.storeConfig.page404')}
      </Title>
      <TextInput label={t('pages.storeConfig.labelTitle')} {...form.getInputProps('storefrontConfig.notFound.title')} />
      <TextInput label={t('pages.storeConfig.labelMessage')} {...form.getInputProps('storefrontConfig.notFound.message')} />

      </Reveal>

      <Divider />

      <Reveal className="flex flex-col gap-5">
      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        {t('pages.storeConfig.footer')}
      </Title>
      <Switch
        label={t('pages.storeConfig.showNewsletterFooter')}
        {...form.getInputProps('storefrontConfig.footer.showNewsletter', { type: 'checkbox' })}
      />
      <Switch
        label={t('pages.storeConfig.showSocialLinksFooter')}
        {...form.getInputProps('storefrontConfig.footer.showSocialLinks', { type: 'checkbox' })}
      />
      <TextInput label={t('pages.storeConfig.copyrightText')} {...form.getInputProps('storefrontConfig.footer.copyrightText')} />
      <Title order={6}>{t('pages.storeConfig.extraLinks')}</Title>
      {cfg.footer.extraLinks.map((link, index) => (
        <Group key={index} align="flex-end">
          <TextInput
            label={t('pages.storeConfig.labelTag')}
            value={link.label}
            onChange={(e) => updateFooterLink(index, 'label', e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <TextInput
            label={t('pages.storeConfig.labelUrl')}
            value={link.href}
            onChange={(e) => updateFooterLink(index, 'href', e.currentTarget.value)}
            style={{ flex: 1 }}
          />
          <Button variant="subtle" color="red" onClick={() => removeFooterLink(index)}>
            {t('common.delete')}
          </Button>
        </Group>
      ))}
      <Button variant="light" onClick={addFooterLink}>
        {t('pages.storeConfig.addFooterLink')}
      </Button>

      </Reveal>

      <Divider />

      <Reveal className="flex flex-col gap-5">
      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        {t('pages.storeConfig.productCard')}
      </Title>
      <Switch label={t('pages.storeConfig.showSku')} {...form.getInputProps('storefrontConfig.productCard.showSku', { type: 'checkbox' })} />
      <Switch label={t('pages.storeConfig.showRating')} {...form.getInputProps('storefrontConfig.productCard.showRating', { type: 'checkbox' })} />
      <Switch label={t('pages.storeConfig.showStockBadge')} {...form.getInputProps('storefrontConfig.productCard.showStockBadge', { type: 'checkbox' })} />
      <Switch label={t('pages.storeConfig.showWishlist')} {...form.getInputProps('storefrontConfig.productCard.showWishlist', { type: 'checkbox' })} />
      <Switch label={t('pages.storeConfig.showQuickView')} {...form.getInputProps('storefrontConfig.productCard.showQuickView', { type: 'checkbox' })} />

      </Reveal>

      <Divider />

      <Reveal className="flex flex-col gap-5">
      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        {t('pages.storeConfig.productBadges')}
      </Title>
      <Switch label={t('pages.storeConfig.badgeNew')} {...form.getInputProps('storefrontConfig.productBadges.showNew', { type: 'checkbox' })} />
      <Switch label={t('pages.storeConfig.badgeSale')} {...form.getInputProps('storefrontConfig.productBadges.showSale', { type: 'checkbox' })} />
      <Switch label={t('pages.storeConfig.badgeLowStock')} {...form.getInputProps('storefrontConfig.productBadges.showLowStock', { type: 'checkbox' })} />
      <NumberInput label={t('pages.storeConfig.lowStockThreshold')} min={0} {...form.getInputProps('storefrontConfig.productBadges.lowStockThreshold')} />
      <NumberInput label={t('pages.storeConfig.newDaysThreshold')} min={0} {...form.getInputProps('storefrontConfig.productBadges.newDaysThreshold')} />

      </Reveal>

      <Divider />

      <Reveal className="flex flex-col gap-5">
      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        {t('pages.storeConfig.catalog')}
      </Title>
      <Select
        label={t('pages.storeConfig.defaultSort')}
        data={[
          { value: 'newest', label: t('pages.storeConfig.sortNewest') },
          { value: 'priceAsc', label: t('pages.storeConfig.sortPriceAsc') },
          { value: 'priceDesc', label: t('pages.storeConfig.sortPriceDesc') },
          { value: 'nameAsc', label: t('pages.storeConfig.sortNameAsc') },
          { value: 'bestSelling', label: t('pages.storeConfig.sortBestSelling') },
        ]}
        {...form.getInputProps('storefrontConfig.catalog.defaultSort')}
      />
      <NumberInput label={t('pages.storeConfig.defaultPageSize')} min={1} max={96} {...form.getInputProps('storefrontConfig.catalog.defaultPageSize')} />
      <Switch label={t('pages.storeConfig.showFilters')} {...form.getInputProps('storefrontConfig.catalog.showFilters', { type: 'checkbox' })} />

      </Reveal>

      <Divider />

      <Reveal className="flex flex-col gap-5">
      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        {t('pages.storeConfig.relatedProducts')}
      </Title>
      <Switch label={t('pages.storeConfig.enableRelatedProducts')} {...form.getInputProps('storefrontConfig.relatedProducts.enabled', { type: 'checkbox' })} />
      <Select
        label={t('pages.storeConfig.strategy')}
        data={[
          { value: 'sameCategory', label: t('pages.storeConfig.strategySameCategory') },
          { value: 'sameCollection', label: t('pages.storeConfig.strategySameCollection') },
          { value: 'none', label: t('pages.storeConfig.strategyNone') },
        ]}
        {...form.getInputProps('storefrontConfig.relatedProducts.strategy')}
      />
      <NumberInput label={t('pages.storeConfig.maxQuantity')} min={0} max={12} {...form.getInputProps('storefrontConfig.relatedProducts.limit')} />

      </Reveal>

      <Divider />

      <Reveal className="flex flex-col gap-5">
      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        {t('pages.storeConfig.cart')}
      </Title>
      <TextInput label={t('pages.storeConfig.trustBadges')} {...form.getInputProps('storefrontConfig.cart.trustBadges')} value={cfg.cart.trustBadges.join(', ')} onChange={(e) => setSection('storefrontConfig.cart.trustBadges', e.currentTarget.value.split(',').map((s) => s.trim()).filter(Boolean))} />
      <Switch label={t('pages.storeConfig.showFreeShippingProgress')} {...form.getInputProps('storefrontConfig.cart.showFreeShippingProgress', { type: 'checkbox' })} />

      </Reveal>

      <Divider />

      <Reveal className="flex flex-col gap-5">
      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        {t('pages.storeConfig.checkout')}
      </Title>
      <Switch label={t('pages.storeConfig.requirePhone')} {...form.getInputProps('storefrontConfig.checkout.requirePhone', { type: 'checkbox' })} />
      <Switch label={t('pages.storeConfig.showCompanyField')} {...form.getInputProps('storefrontConfig.checkout.showCompanyField', { type: 'checkbox' })} />
      <Switch label={t('pages.storeConfig.showOrderNotes')} {...form.getInputProps('storefrontConfig.checkout.showOrderNotes', { type: 'checkbox' })} />
      <TextInput label={t('pages.storeConfig.thankYouMessage')} {...form.getInputProps('storefrontConfig.checkout.thankYouMessage')} />

      </Reveal>

      <Divider />

      <Reveal className="flex flex-col gap-5">
      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        {t('pages.storeConfig.crossSell')}
      </Title>
      <Switch label={t('pages.storeConfig.enableCrossSell')} {...form.getInputProps('storefrontConfig.crossSell.enabled', { type: 'checkbox' })} />
      {cfg.crossSell.enabled && (
        <>
          <TextInput label={t('pages.storeConfig.labelTitle')} {...form.getInputProps('storefrontConfig.crossSell.title')} />
          <Select
            label={t('pages.storeConfig.strategy')}
            data={[
              { value: 'sameCategory', label: t('pages.storeConfig.strategySameCategory') },
              { value: 'bestSelling', label: t('pages.storeConfig.sortBestSelling') },
              { value: 'none', label: t('pages.storeConfig.strategyNone') },
            ]}
            {...form.getInputProps('storefrontConfig.crossSell.strategy')}
          />
          <NumberInput label={t('pages.storeConfig.maxQuantity')} min={0} max={12} {...form.getInputProps('storefrontConfig.crossSell.limit')} />
        </>
      )}

      </Reveal>

      <Divider />

      <Reveal className="flex flex-col gap-5">
      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        {t('pages.storeConfig.featureFlags')}
      </Title>
      <Switch label={t('pages.storeConfig.enableWishlist')} {...form.getInputProps('storefrontConfig.featureFlags.enableWishlist', { type: 'checkbox' })} />
      <Switch label={t('pages.storeConfig.enableCompare')} {...form.getInputProps('storefrontConfig.featureFlags.enableCompare', { type: 'checkbox' })} />
      <Switch label={t('pages.storeConfig.enableReviews')} {...form.getInputProps('storefrontConfig.featureFlags.enableReviews', { type: 'checkbox' })} />
      <Switch label={t('pages.storeConfig.enableCustomizer')} {...form.getInputProps('storefrontConfig.featureFlags.enableCustomizer', { type: 'checkbox' })} />
      <Switch label={t('pages.storeConfig.enableGuestCheckout')} {...form.getInputProps('storefrontConfig.featureFlags.enableGuestCheckout', { type: 'checkbox' })} />
      <Switch label={t('pages.storeConfig.enableQuickView')} {...form.getInputProps('storefrontConfig.featureFlags.enableQuickView', { type: 'checkbox' })} />

      </Reveal>

      <Divider />

      <Reveal className="flex flex-col gap-5">
      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        {t('pages.storeConfig.advancedBranding')}
      </Title>
      <TextInput label={t('pages.storeConfig.logoUrl')} {...form.getInputProps('storefrontConfig.branding.logoUrl')} />
      <Textarea label={t('pages.storeConfig.customCss')} {...form.getInputProps('storefrontConfig.branding.customCss')} minRows={4} />

      </Reveal>

      <Divider />

      <Reveal className="flex flex-col gap-5">
      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        {t('pages.storeConfig.seoDefaults')}
      </Title>
      <TextInput label={t('pages.storeConfig.titleTemplate')} {...form.getInputProps('storefrontConfig.seo.defaultTitleTemplate')} description={t('pages.storeConfig.titleTemplateHint')} />
      <TextInput label={t('pages.storeConfig.productTitleTemplate')} {...form.getInputProps('storefrontConfig.seo.productTitleTemplate')} description={t('pages.storeConfig.productTitleTemplateHint')} />
      <TextInput label={t('pages.storeConfig.categoryTitleTemplate')} {...form.getInputProps('storefrontConfig.seo.categoryTitleTemplate')} description={t('pages.storeConfig.categoryTitleTemplateHint')} />
      <TextInput label={t('pages.storeConfig.pageTitleTemplate')} {...form.getInputProps('storefrontConfig.seo.pageTitleTemplate')} description={t('pages.storeConfig.pageTitleTemplateHint')} />
      <Textarea label={t('pages.storeConfig.defaultDescription')} {...form.getInputProps('storefrontConfig.seo.defaultDescription')} minRows={2} />
      <TextInput label={t('pages.storeConfig.ogImageUrl')} {...form.getInputProps('storefrontConfig.seo.ogImageUrl')} />

      </Reveal>

      <Divider />

      <Reveal className="flex flex-col gap-5">
      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        {t('pages.storeConfig.externalScripts')}
      </Title>
      {cfg.externalScripts.map((script, index) => (
        <Stack key={script.id} gap="xs" style={{ padding: 12, border: '1px solid #e4e2e1' }}>
          <Group align="flex-end">
            <TextInput
              label={t('pages.storeConfig.scriptName')}
              value={script.name}
              onChange={(e) => updateExternalScript(index, 'name', e.currentTarget.value)}
              style={{ flex: 1 }}
            />
            <Select
              label={t('pages.storeConfig.scriptPlacement')}
              value={script.placement}
              onChange={(value) => value && updateExternalScript(index, 'placement', value)}
              data={[
                { value: 'head', label: '<head>' },
                { value: 'body', label: '<body>' },
              ]}
            />
            <Button variant="subtle" color="red" onClick={() => removeExternalScript(index)}>
              {t('common.delete')}
            </Button>
          </Group>
          <Textarea
            label={t('pages.storeConfig.scriptCode')}
            value={script.code}
            onChange={(e) => updateExternalScript(index, 'code', e.currentTarget.value)}
            minRows={3}
          />
        </Stack>
      ))}
      <Button variant="light" onClick={addExternalScript}>
        {t('pages.storeConfig.addScript')}
      </Button>

      </Reveal>

      <Divider />

      <Reveal className="flex flex-col gap-5">
      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        {t('pages.storeConfig.whatsappButton')}
      </Title>
      <Switch label={t('pages.storeConfig.enable')} {...form.getInputProps('storefrontConfig.whatsappButton.enabled', { type: 'checkbox' })} />
      {cfg.whatsappButton.enabled && (
        <>
          <TextInput label={t('pages.storeConfig.whatsappNumber')} {...form.getInputProps('storefrontConfig.whatsappButton.phone')} description={t('pages.storeConfig.whatsappNumberHint')} />
          <TextInput label={t('pages.storeConfig.defaultMessage')} {...form.getInputProps('storefrontConfig.whatsappButton.message')} />
          <Select
            label={t('pages.storeConfig.position')}
            data={[
              { value: 'bottomRight', label: t('pages.storeConfig.positionBottomRight') },
              { value: 'bottomLeft', label: t('pages.storeConfig.positionBottomLeft') },
            ]}
            {...form.getInputProps('storefrontConfig.whatsappButton.position')}
          />
        </>
      )}

      </Reveal>

      <Divider />

      <Reveal className="flex flex-col gap-5">
      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        {t('pages.storeConfig.fonts')}
      </Title>
      <Select
        label={t('pages.storeConfig.headingFont')}
        data={FONT_OPTIONS}
        {...form.getInputProps('storefrontConfig.fonts.heading')}
      />
      <Select
        label={t('pages.storeConfig.bodyFont')}
        data={FONT_OPTIONS}
        {...form.getInputProps('storefrontConfig.fonts.body')}
      />
      <Select
        label={t('pages.storeConfig.monospaceFont')}
        data={FONT_OPTIONS}
        {...form.getInputProps('storefrontConfig.fonts.mono')}
      />

      </Reveal>

      <Divider />

      <Reveal className="flex flex-col gap-5">
      <Title order={4} style={{ fontFamily: 'var(--font-bebas-neue)' }}>
        {t('pages.storeConfig.popups')}
      </Title>
      {cfg.popups.map((popup, index) => (
        <Stack key={popup.id} gap="xs" style={{ padding: 12, border: '1px solid #e4e2e1' }}>
          <Group align="flex-end">
            <TextInput
              label={t('pages.storeConfig.internalName')}
              value={popup.name}
              onChange={(e) => updatePopup(index, 'name', e.currentTarget.value)}
              style={{ flex: 1 }}
            />
            <Switch
              label={t('pages.storeConfig.active')}
              checked={popup.enabled}
              onChange={(e) => updatePopup(index, 'enabled', e.currentTarget.checked)}
            />
            <Button variant="subtle" color="red" onClick={() => removePopup(index)}>
              {t('common.delete')}
            </Button>
          </Group>
          <TextInput
            label={t('pages.storeConfig.labelTitle')}
            value={popup.title}
            onChange={(e) => updatePopup(index, 'title', e.currentTarget.value)}
          />
          <Textarea
            label={t('pages.storeConfig.content')}
            value={popup.content}
            onChange={(e) => updatePopup(index, 'content', e.currentTarget.value)}
            minRows={2}
          />
          <Group grow>
            <TextInput
              label={t('pages.storeConfig.buttonText')}
              value={popup.buttonText}
              onChange={(e) => updatePopup(index, 'buttonText', e.currentTarget.value)}
            />
            <TextInput
              label={t('pages.storeConfig.buttonLink')}
              value={popup.buttonLink}
              onChange={(e) => updatePopup(index, 'buttonLink', e.currentTarget.value)}
            />
          </Group>
          <Select
            label={t('pages.storeConfig.trigger')}
            value={popup.trigger}
            onChange={(value) => value && updatePopup(index, 'trigger', value)}
            data={[
              { value: 'immediate', label: t('pages.storeConfig.triggerImmediate') },
              { value: 'afterDelay', label: t('pages.storeConfig.triggerAfterDelay') },
              { value: 'scroll', label: t('pages.storeConfig.triggerScroll') },
              { value: 'exitIntent', label: t('pages.storeConfig.triggerExitIntent') },
            ]}
          />
          {popup.trigger === 'afterDelay' && (
            <NumberInput
              label={t('pages.storeConfig.delaySeconds')}
              min={0}
              value={popup.delaySeconds}
              onChange={(value) => updatePopup(index, 'delaySeconds', Number(value) || 0)}
            />
          )}
          {popup.trigger === 'scroll' && (
            <NumberInput
              label={t('pages.storeConfig.scrollPercent')}
              min={0}
              max={100}
              value={popup.scrollPercent}
              onChange={(value) => updatePopup(index, 'scrollPercent', Number(value) || 0)}
            />
          )}
          <Group grow>
            <ColorInput label={t('pages.storeConfig.labelBackgroundColor')} value={popup.backgroundColor} onChange={(value) => updatePopup(index, 'backgroundColor', value)} />
            <ColorInput label={t('pages.storeConfig.labelTextColor')} value={popup.textColor} onChange={(value) => updatePopup(index, 'textColor', value)} />
          </Group>
          <Switch
            label={t('pages.storeConfig.showOnce')}
            checked={popup.showOnce}
            onChange={(e) => updatePopup(index, 'showOnce', e.currentTarget.checked)}
          />
        </Stack>
      ))}
      <Button variant="light" onClick={addPopup}>
        {t('pages.storeConfig.addPopup')}
      </Button>
      </Reveal>
    </>
  );
}

const FONT_OPTIONS = [
  { value: 'Bebas Neue', label: 'Bebas Neue' },
  { value: 'Inter', label: 'Inter' },
  { value: 'JetBrains Mono', label: 'JetBrains Mono' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Montserrat', label: 'Montserrat' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Source Sans 3', label: 'Source Sans 3' },
  { value: 'Work Sans', label: 'Work Sans' },
];
