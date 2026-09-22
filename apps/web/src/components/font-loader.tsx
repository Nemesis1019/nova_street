import { parseStorefrontConfig } from '../lib/storefront-config';
import type { StoreConfig } from '../providers/config-provider';

interface FontLoaderProps {
  config: StoreConfig;
}

const FALLBACK_STACKS: Record<string, string> = {
  'Bebas Neue': 'sans-serif',
  Inter: 'sans-serif',
  'JetBrains Mono': 'monospace',
  Roboto: 'sans-serif',
  Montserrat: 'sans-serif',
  'Playfair Display': 'serif',
  'Source Sans 3': 'sans-serif',
  'Work Sans': 'sans-serif',
};

function googleFontFamily(name: string): string {
  return name.replace(/\s+/g, '+');
}

function fontFamily(name: string): string {
  return `'${name}', ${FALLBACK_STACKS[name] ?? 'sans-serif'}`;
}

export function FontLoader({ config }: FontLoaderProps) {
  const storefront = parseStorefrontConfig(config.storefrontConfig);
  const { heading, body, mono } = storefront.fonts;
  const uniqueFonts = Array.from(new Set([heading, body, mono]));

  return (
    <>
      {uniqueFonts.map((font) => (
        <link
          key={font}
          rel="stylesheet"
          href={`https://fonts.googleapis.com/css2?family=${googleFontFamily(font)}:wght@400;500;600;700&display=swap`}
        />
      ))}
      <style
        dangerouslySetInnerHTML={{
          __html: `
            :root {
              --font-bebas-neue: ${fontFamily(heading)};
              --font-inter: ${fontFamily(body)};
              --font-jetbrains-mono: ${fontFamily(mono)};
            }
          `,
        }}
      />
    </>
  );
}
