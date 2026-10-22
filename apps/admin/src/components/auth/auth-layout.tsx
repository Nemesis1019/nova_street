'use client';

import { ReactNode } from 'react';

import { useTranslation } from '../../providers/i18n-provider';

const LOCALES = ['es', 'en', 'pt'] as const;

/**
 * Shell de las pantallas de autenticación: contenido centrado y selector de
 * idioma arriba a la derecha. No usa AdminShell.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  const { locale, setLocale } = useTranslation();

  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="flex items-center justify-end gap-4 px-4 py-4 sm:px-8">
        <div className="flex items-center overflow-hidden rounded-lg border border-outline-variant/40 bg-surface-container-lowest">
          {LOCALES.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setLocale(item)}
              aria-pressed={locale === item}
              className={`px-2.5 py-1 font-label-sm text-label-sm uppercase transition-colors ${
                locale === item
                  ? 'bg-primary text-on-primary'
                  : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
              }`}
            >
              {item}
            </button>
          ))}
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-10 sm:py-14">
        <div className="w-full max-w-[440px]">{children}</div>
      </main>
    </div>
  );
}
