import Link from 'next/link';

import { apiClient } from '../lib/api';
import { parseStorefrontConfig } from '../lib/storefront-config';

export const dynamic = 'force-dynamic';

async function getStoreConfig() {
  try {
    // Usa el apiClient del storefront: resuelve el tenant desde el host y
    // envía X-Tenant, para no caer siempre en la tienda por defecto.
    const { data } = await apiClient.GET('/store-config', {
      init: { next: { revalidate: 0 } },
    });
    return (data ?? null) as { storefrontConfig?: unknown; name?: string } | null;
  } catch {
    return null;
  }
}

export default async function NotFound() {
  const config = await getStoreConfig();
  const storefront = parseStorefrontConfig(config?.storefrontConfig);
  const notFound = storefront.notFound;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#fcf9f8',
        padding: '64px 16px',
        textAlign: 'center',
        gap: '24px',
      }}
    >
      <Link
        href="/"
        style={{
          fontFamily: 'var(--font-bebas-neue), Bebas Neue, Impact, sans-serif',
          fontSize: '28px',
          letterSpacing: '0.05em',
          color: '#0d0d0d',
          textDecoration: 'none',
        }}
      >
        {config?.name ?? 'Tienda'}
      </Link>
      <h1 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: 'clamp(48px, 10vw, 120px)', margin: 0 }}>
        404
      </h1>
      <h2 style={{ fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif', fontSize: '28px', letterSpacing: '0.05em', margin: 0 }}>
        {notFound.title}
      </h2>
      <p style={{ maxWidth: 420, color: '#5f5f58' }}>{notFound.message}</p>
      <Link
        href="/"
        style={{
          display: 'inline-block',
          padding: '16px 32px',
          backgroundColor: '#0d0d0d',
          color: '#fcf9f8',
          textDecoration: 'none',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          fontFamily: 'var(--font-bebas-neue), Bebas Neue, sans-serif',
        }}
      >
        Volver al inicio
      </Link>
    </div>
  );
}
