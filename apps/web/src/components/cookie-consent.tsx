'use client';

import { Button, Container, Group, Stack, Text } from '@mantine/core';
import { IconCookie } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';

import { apiClient } from '../lib/api';
import { useTranslation } from '../providers/i18n-provider';

const STORAGE_KEY = 'nova-cookie-consent';
/** Si cambia la versión de la política, se vuelve a pedir el consentimiento. */
const CONSENT_VERSION = 1;
/** Evento global para reabrir el panel (ej. link "Cookies" del footer). */
const OPEN_EVENT = 'nova:cookie-consent-open';

export interface CookieConsentRecord {
  version: number;
  decision: 'accepted' | 'rejected';
  decidedAt: string;
}

export function readCookieConsent(): CookieConsentRecord | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CookieConsentRecord;
    if (!parsed || parsed.version !== CONSENT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Permite reabrir el panel desde cualquier parte de la app. */
export function openCookieConsent() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(OPEN_EVENT));
  }
}

/**
 * Panel de consentimiento de cookies (informativo, estilo banner inferior):
 * se muestra hasta que el usuario acepta o rechaza, y puede reabrirse desde
 * el footer. La decisión se guarda en localStorage con versión y fecha.
 */
export function CookieConsent() {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setVisible(readCookieConsent() === null);
    const onOpen = () => setVisible(true);
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  const decide = useCallback((decision: 'accepted' | 'rejected') => {
    const record: CookieConsentRecord = {
      version: CONSENT_VERSION,
      decision,
      decidedAt: new Date().toISOString(),
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
    } catch {
      // Si el storage está bloqueado, igual ocultamos el panel en esta sesión.
    }
    setVisible(false);
  }, []);

  const { data: pages } = useQuery({
    queryKey: ['public-pages', 'cookie-consent'],
    queryFn: async () => {
      const { data } = await apiClient.GET('/pages');
      // El endpoint devuelve `{ data: [...] }` (PageListResponseDto).
      return (data?.data ?? []) as Array<{ slug: string }>;
    },
    enabled: visible,
    staleTime: 300_000,
  });

  const policySlug =
    pages?.find((page) => page.slug === 'politica-de-cookies')?.slug ??
    pages?.find((page) => page.slug === 'politica-de-privacidad')?.slug ??
    null;

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label={t('cookies.title')}
      style={{
        position: 'fixed',
        insetInline: 0,
        bottom: 0,
        zIndex: 300,
        backgroundColor: '#fcf9f8',
        borderTop: '1px solid #0d0d0d',
      }}
    >
      <Container size="xl" py="md">
        <Group justify="space-between" align="center" gap="lg" wrap="wrap">
          <Group gap="md" align="flex-start" wrap="nowrap" style={{ flex: 1, minWidth: 260 }}>
            <IconCookie size={34} stroke={1.5} style={{ color: '#0d0d0d', flexShrink: 0 }} />
            <Stack gap={4}>
              <Text
                style={{
                  fontFamily: 'var(--font-bebas-neue)',
                  fontSize: 26,
                  lineHeight: 1,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: '#0d0d0d',
                }}
              >
                {t('cookies.title')}
              </Text>
              <Text size="sm" style={{ color: '#1b1c1c', maxWidth: 640 }}>
                {t('cookies.description')}{' '}
                {policySlug && (
                  <Link href={`/pagina/${policySlug}`} style={{ color: 'inherit', textDecoration: 'underline' }}>
                    {t('cookies.policy')}
                  </Link>
                )}
              </Text>
            </Stack>
          </Group>
          <Group gap="sm">
            <Button
              onClick={() => decide('accepted')}
              style={{
                backgroundColor: '#6f7a4e',
                color: '#fcf9f8',
                fontFamily: 'var(--font-bebas-neue)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {t('cookies.accept')}
            </Button>
            <Button
              variant="outline"
              onClick={() => decide('rejected')}
              style={{
                borderColor: '#0d0d0d',
                color: '#0d0d0d',
                fontFamily: 'var(--font-bebas-neue)',
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
              }}
            >
              {t('cookies.reject')}
            </Button>
          </Group>
        </Group>
      </Container>
    </div>
  );
}
