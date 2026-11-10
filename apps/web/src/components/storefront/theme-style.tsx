import type { StorefrontMotion, StorefrontTokens } from '@ecommerce/shared';

import { storefrontThemeVars } from '../../lib/storefront-theme';

/** Inyecta el tema del tenant antes del primer paint. */
export function StorefrontThemeStyle({
  tokens,
  motion,
}: {
  tokens: StorefrontTokens;
  motion?: StorefrontMotion | null;
}) {
  const vars = storefrontThemeVars(tokens, motion);
  const cssVars = Object.entries(vars)
    .map(([key, value]) => `${key}:${value};`)
    .join('');
  const customCss = (tokens.customCss ?? '').replace(/<\/style/gi, '<\\/style');

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `
          :root { ${cssVars} }
          body { background: var(--sf-color-canvas); color: var(--sf-color-text); }
          ${customCss}
        `,
      }}
    />
  );
}
