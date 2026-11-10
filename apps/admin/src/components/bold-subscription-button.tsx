'use client';

import { useEffect, useRef, useState } from 'react';

const BOLD_LIBRARY_URL = 'https://checkout.bold.co/library/boldPaymentButton.js';

export interface BoldSubscriptionButtonConfig {
  apiKey: string;
  orderId: string;
  amount: number;
  currency: string;
  integritySignature: string;
  redirectionUrl: string;
  description?: string;
  sandbox: boolean;
  reference: string;
}

function loadBoldLibrary(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>(`script[src="${BOLD_LIBRARY_URL}"]`);
  if (existing) {
    if (existing.dataset.loaded === 'true') return Promise.resolve();
    return new Promise((resolve) => {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener('error', () => resolve(), { once: true });
    });
  }

  return new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = BOLD_LIBRARY_URL;
    script.async = true;
    script.addEventListener(
      'load',
      () => {
        script.dataset.loaded = 'true';
        resolve();
      },
      { once: true },
    );
    script.addEventListener('error', () => resolve(), { once: true });
    document.head.appendChild(script);
  });
}

export function BoldSubscriptionButton({
  config,
  style = 'light-M',
}: {
  config: BoldSubscriptionButtonConfig;
  style?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const mount = async () => {
      await loadBoldLibrary();
      if (cancelled || !containerRef.current) return;

      containerRef.current.innerHTML = '';
      const button = document.createElement('script');
      button.setAttribute('data-bold-button', style);
      button.setAttribute('data-api-key', config.apiKey);
      button.setAttribute('data-amount', String(config.amount));
      button.setAttribute('data-currency', config.currency);
      button.setAttribute('data-order-id', config.orderId);
      button.setAttribute('data-integrity-signature', config.integritySignature);
      button.setAttribute('data-redirection-url', config.redirectionUrl);
      button.setAttribute('data-render-mode', 'embedded');
      if (config.description) {
        button.setAttribute('data-description', config.description.slice(0, 100));
      }
      containerRef.current.appendChild(button);
      setReady(true);
    };

    void mount();

    return () => {
      cancelled = true;
      if (containerRef.current) containerRef.current.innerHTML = '';
    };
  }, [config, style]);

  return (
    <div className="flex min-h-[48px] flex-col justify-center gap-2">
      <div ref={containerRef} />
      {!ready ? (
        <span className="font-body-sm text-body-sm text-on-surface-variant">
          Cargando botón de pago seguro…
        </span>
      ) : null}
    </div>
  );
}
