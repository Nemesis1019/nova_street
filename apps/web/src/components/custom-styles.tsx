'use client';

import { parseStorefrontConfig } from '../lib/storefront-config';
import { useStoreConfig } from '../providers/config-provider';

export function CustomStyles() {
  const config = useStoreConfig();
  const storefront = parseStorefrontConfig(config.storefrontConfig);
  const css = storefront.branding.customCss?.trim();

  if (!css) return null;

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}
