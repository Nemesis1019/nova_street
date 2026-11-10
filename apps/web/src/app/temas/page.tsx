import { STOREFRONT_MARKETPLACE_PRESETS } from '@ecommerce/shared';
import type { Metadata } from 'next';
import Link from 'next/link';

import { StoreFooter } from '../../components/store-footer';
import { StoreHeader } from '../../components/store-header';

export const metadata: Metadata = {
  title: 'Temas para tu tienda',
  description:
    'Cuatro identidades visuales para construir un storefront propio: coffee editorial, streetwear, minimal boutique y market catalog.',
};

const adminUrl = process.env.NEXT_PUBLIC_ADMIN_URL ?? 'http://localhost:3001';

export default function ThemesPage() {
  return (
    <>
      <StoreHeader />
      <main
        style={{
          backgroundColor: 'var(--sf-color-canvas, #fcf9f8)',
          color: 'var(--sf-color-text, #1f1b16)',
          padding: '80px 24px 112px',
        }}
      >
        <div style={{ maxWidth: 1280, margin: '0 auto' }}>
          <p
            style={{
              margin: 0,
              fontFamily: 'var(--sf-font-mono, monospace)',
              fontSize: 11,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: 'var(--sf-color-text-muted, #6b6258)',
            }}
          >
            Marketplace · Temas
          </p>
          <h1
            style={{
              maxWidth: 900,
              margin: '16px 0 0',
              fontFamily: 'var(--sf-font-display, serif)',
              fontSize: 'clamp(2.8rem, 6vw, 5.6rem)',
              fontWeight: 500,
              lineHeight: 0.94,
              letterSpacing: '-0.035em',
            }}
          >
            Una identidad para cada forma de vender.
          </h1>
          <p
            style={{
              maxWidth: 620,
              margin: '24px 0 0',
              fontFamily: 'var(--sf-font-body, sans-serif)',
              fontSize: 17,
              lineHeight: 1.65,
              color: 'var(--sf-color-text-muted, #6b6258)',
            }}
          >
            Los temas son composiciones curadas: cambian color, tipografía, hero, catálogo y movimiento sin tocar código.
            Aplicá uno desde el panel y ajustá cada sección a tu marca.
          </p>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
              gap: 24,
              marginTop: 56,
            }}
          >
            {STOREFRONT_MARKETPLACE_PRESETS.map((preset, index) => (
              <article
                key={preset.key}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  overflow: 'hidden',
                  borderRadius: 4,
                  border: `1px solid ${preset.palette.border}`,
                  backgroundColor: preset.palette.surface,
                  color: preset.palette.text,
                }}
              >
                <div
                  style={{
                    position: 'relative',
                    minHeight: index === 0 ? 260 : 210,
                    backgroundImage: `linear-gradient(180deg, rgba(10,10,10,0.05), rgba(10,10,10,0.48)), url(${preset.heroImage})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                  }}
                >
                  <span
                    style={{
                      position: 'absolute',
                      top: 14,
                      left: 14,
                      padding: '4px 8px',
                      backgroundColor: preset.palette.surface,
                      color: preset.palette.text,
                      fontFamily: 'var(--sf-font-mono, monospace)',
                      fontSize: 9,
                      letterSpacing: '0.1em',
                      textTransform: 'uppercase',
                    }}
                  >
                    0{index + 1}
                  </span>
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 16,
                      left: 16,
                      right: 16,
                      color: '#fff',
                      fontFamily: 'var(--sf-font-display, serif)',
                      fontSize: 'clamp(1.45rem, 2.4vw, 2.1rem)',
                      lineHeight: 1,
                    }}
                  >
                    {preset.name}
                  </span>
                </div>

                <div style={{ display: 'flex', flex: 1, flexDirection: 'column', gap: 14, padding: 18 }}>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: 'var(--sf-font-body, sans-serif)',
                      fontSize: 14,
                      lineHeight: 1.55,
                      color: preset.palette.text,
                      opacity: 0.72,
                    }}
                  >
                    {preset.tagline}
                  </p>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {[preset.palette.canvas, preset.palette.brand, preset.palette.accent, preset.palette.border].map(
                      (color) => (
                        <span
                          key={color}
                          title={color}
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: '50%',
                            backgroundColor: color,
                            border: `1px solid ${preset.palette.border}`,
                          }}
                        />
                      ),
                    )}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: 'var(--sf-font-mono, monospace)',
                      fontSize: 10,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: preset.palette.text,
                      opacity: 0.55,
                    }}
                  >
                    {preset.fonts.display} / {preset.fonts.body}
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontFamily: 'var(--sf-font-body, sans-serif)',
                      fontSize: 13,
                      lineHeight: 1.55,
                      color: preset.palette.text,
                      opacity: 0.68,
                    }}
                  >
                    {preset.description}
                  </p>
                  <Link
                    href={`${adminUrl}/design`}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      marginTop: 'auto',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 8,
                      alignSelf: 'flex-start',
                      paddingTop: 8,
                      color: preset.palette.text,
                      fontFamily: 'var(--sf-font-mono, monospace)',
                      fontSize: 10,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      textDecoration: 'underline',
                      textUnderlineOffset: 4,
                    }}
                  >
                    Usar en el panel ↗
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </main>
      <StoreFooter />
    </>
  );
}
