'use client';

import { Image } from '@mantine/core';

import { parseStorefrontConfig } from '../lib/storefront-config';
import { useStoreConfig } from '../providers/config-provider';
import { LinkAnchor } from './link-anchor';

/**
 * Logo de la tienda: usa la imagen configurada en el store config
 * (`storefrontConfig.branding.logoUrl` o `config.logoUrl`) y cae al nombre
 * como texto solo si no hay imagen configurada.
 */
export function BrandLogo({ size = 44 }: { size?: number }) {
  const config = useStoreConfig();
  const storefrontConfig = parseStorefrontConfig(config.storefrontConfig);
  const logoUrl = storefrontConfig.branding.logoUrl || config.logoUrl;

  return (
    <LinkAnchor
      href="/"
      underline="never"
      aria-label={config.name}
      style={{ display: 'inline-flex', alignItems: 'center', color: 'inherit' }}
    >
      {logoUrl ? (
        <Image src={logoUrl} alt={config.name} width={size} height={size} fit="contain" />
      ) : (
        <span
          style={{
            fontFamily: 'var(--font-bebas-neue), Bebas Neue, Impact, sans-serif',
            fontSize: `${Math.round(size * 0.64)}px`,
            letterSpacing: '0.05em',
            color: 'inherit',
          }}
        >
          {config.name}
        </span>
      )}
    </LinkAnchor>
  );
}
