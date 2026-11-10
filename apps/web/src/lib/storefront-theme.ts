import type { StorefrontDocument, StorefrontMotion, StorefrontTokens } from '@ecommerce/shared';

import type { StoreConfig, TemplateConfig } from '../providers/config-provider';
import { storefrontMotionVars } from './storefront-motion';

/**
 * Aplica el documento publicado al StoreConfig efectivo del storefront.
 * El documento manda sobre colores/fuentes/navegación; el StoreConfig sigue
 * aportando datos comerciales (moneda, envíos, páginas, etc.).
 */
export function applyStorefrontDocument(
  config: StoreConfig,
  doc: StorefrontDocument | null | undefined,
): StoreConfig {
  if (!doc) return config;

  const legacy = (config.storefrontConfig ?? {}) as Record<string, unknown>;
  const legacyCatalog =
    legacy.catalog && typeof legacy.catalog === 'object'
      ? (legacy.catalog as Record<string, unknown>)
      : {};
  const headerVariant =
    doc.header.variant === 'centered'
      ? 'centered'
      : doc.header.variant === 'minimal'
        ? 'minimal'
        : 'default';

  const templateConfig: TemplateConfig = {
    ...(config.templateConfig ?? {}),
    headerVariant,
    productCardVariant: doc.pages.catalog.productCardVariant,
  };

  return {
    ...config,
    primaryColor: doc.tokens.colors.brand,
    secondaryColor: doc.tokens.colors.accent,
    backgroundColor: doc.tokens.colors.canvas,
    textColor: doc.tokens.colors.text,
    surfaceColor: doc.tokens.colors.surface,
    surfaceMutedColor: doc.tokens.colors.surfaceMuted,
    borderColor: doc.tokens.colors.border,
    darkBackgroundColor: doc.tokens.colors.text,
    darkTextColor: doc.tokens.colors.inverse,
    description: doc.footer.tagline || config.description,
    templateConfig,
    storefrontDoc: doc,
    storefrontConfig: {
      ...legacy,
      navigation: doc.header.navigation,
      announcementBar: {
        enabled: doc.header.announcement.enabled,
        text: doc.header.announcement.text,
        link: doc.header.announcement.link || undefined,
        backgroundColor: doc.header.announcement.backgroundColor,
        textColor: doc.header.announcement.textColor,
        startsAt: doc.header.announcement.startsAt || undefined,
        endsAt: doc.header.announcement.endsAt || undefined,
      },
      fonts: doc.tokens.fonts,
      footer: {
        showNewsletter: doc.footer.showNewsletter,
        showSocialLinks: doc.footer.showSocialLinks,
        copyrightText: doc.footer.copyrightText,
        extraLinks: doc.footer.extraLinks,
      },
      catalog: {
        ...legacyCatalog,
        showFilters: doc.pages.catalog.showFilters,
        defaultPageSize:
          typeof legacyCatalog.defaultPageSize === 'number'
            ? legacyCatalog.defaultPageSize
            : 12,
        defaultSort:
          typeof legacyCatalog.defaultSort === 'string'
            ? legacyCatalog.defaultSort
            : 'newest',
      },
    },
  };
}

/** Variables CSS que consumen los bloques y los componentes tokenizados. */
export function storefrontThemeVars(
  tokens: StorefrontTokens,
  motion?: StorefrontMotion | null,
): Record<string, string> {
  return {
    ...storefrontMotionVars(motion),
    '--sf-color-canvas': tokens.colors.canvas,
    '--sf-color-surface': tokens.colors.surface,
    '--sf-color-surface-muted': tokens.colors.surfaceMuted,
    '--sf-color-text': tokens.colors.text,
    '--sf-color-text-muted': tokens.colors.textMuted,
    '--sf-color-brand': tokens.colors.brand,
    '--sf-color-accent': tokens.colors.accent,
    '--sf-color-border': tokens.colors.border,
    '--sf-color-inverse': tokens.colors.inverse,
    '--sf-font-display': `'${tokens.fonts.display}', serif`,
    '--sf-font-heading': `'${tokens.fonts.heading}', sans-serif`,
    '--sf-font-body': `'${tokens.fonts.body}', sans-serif`,
    '--sf-font-mono': `'${tokens.fonts.mono}', monospace`,
    '--sf-radius': tokens.shape.radius,
    '--sf-border-width': tokens.shape.borderWidth,
    '--sf-shadow': tokens.shape.shadow,
    '--sf-space-section': tokens.spacing.section,
    '--sf-container': tokens.spacing.container,
    '--sf-gap': tokens.spacing.gap,
    '--sf-product-ratio': tokens.image.productRatio,
    '--sf-hero-overlay': String(tokens.image.heroOverlay),
  };
}
