'use client';

import { Button, Container, Divider, Group, Stack, Text, TextInput } from '@mantine/core';
import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import { useState } from 'react';

import { apiClient } from '../lib/api';
import { bebasNeue, jetbrainsMono } from '../lib/fonts';
import { getApiErrorMessage, notifyError, notifySuccess } from '../lib/notifications';
import { parseStorefrontConfig } from '../lib/storefront-config';
import { useStoreConfig } from '../providers/config-provider';
import { useTranslation } from '../providers/i18n-provider';
import { openCookieConsent } from './cookie-consent';

export function StoreFooter() {
  const config = useStoreConfig();
  const { t } = useTranslation();
  const storefront = parseStorefrontConfig(config.storefrontConfig);
  const footer = storefront.footer;
  const socialLinks = config.socialLinks && typeof config.socialLinks === 'object' ? (config.socialLinks as Record<string, string>) : {};

  const { data: pagesResponse } = useQuery({
    queryKey: ['pages'],
    queryFn: async () => {
      const { data } = await apiClient.GET('/pages');
      return data;
    },
  });

  const pages = pagesResponse?.data ?? [];
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterLoading, setNewsletterLoading] = useState(false);

  const subscribeToNewsletter = async () => {
    const email = newsletterEmail.trim();
    if (!email) {
      notifyError({ title: 'Newsletter', message: 'Ingresá tu email para suscribirte.' });
      return;
    }
    setNewsletterLoading(true);
    try {
      const { error } = await apiClient.POST('/newsletter/subscribe', {
        body: { email, source: 'footer' },
      });
      if (error) throw error;
      notifySuccess({ title: 'Newsletter', message: 'Gracias por suscribirte. Te escribimos pronto.' });
      setNewsletterEmail('');
    } catch (error) {
      notifyError({ title: 'No pudimos suscribirte', message: getApiErrorMessage(error) });
    } finally {
      setNewsletterLoading(false);
    }
  };

  return (
    <footer
      style={{
        borderTop: '1px solid #0d0d0d',
        marginTop: 'auto',
        backgroundColor: '#fcf9f8',
        color: '#1b1c1c',
      }}
    >
      <Container fluid px={{ base: 16, md: 64 }} py="xl">
        <Stack gap="xl">
          <Group justify="space-between" align="flex-start" wrap="wrap" gap="xl">
            <Stack gap="md" maw={400}>
              <Text
                style={{
                  fontFamily: 'var(--font-bebas-neue), Bebas Neue, Impact, sans-serif',
                  fontSize: '48px',
                  letterSpacing: '0.02em',
                }}
              >
                {config.name}
              </Text>
              <Text size="sm" c="dimmed">
                {config.description}
              </Text>
            </Stack>

            <Stack gap="xs">
              <Text
                className={jetbrainsMono.className}
                size="xs"
                style={{
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Navegación
              </Text>
              <Link href="/catalogo" style={{ color: 'inherit', textDecoration: 'none', fontSize: '14px' }}>
                Catálogo
              </Link>
              <Link href="/account" style={{ color: 'inherit', textDecoration: 'none', fontSize: '14px' }}>
                Mi cuenta
              </Link>
              {pages.map((page) => (
                <Link
                  key={page.id}
                  href={`/pagina/${page.slug}`}
                  style={{ color: 'inherit', textDecoration: 'none', fontSize: '14px' }}
                >
                  {page.title}
                </Link>
              ))}
              {footer.extraLinks.map((link, index) => (
                <Link
                  key={`extra-${index}`}
                  href={link.href}
                  style={{ color: 'inherit', textDecoration: 'none', fontSize: '14px' }}
                >
                  {link.label}
                </Link>
              ))}
            </Stack>

            <Stack gap="xs">
              <Text
                className={jetbrainsMono.className}
                size="xs"
                style={{
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                Contacto
              </Text>
              {config.contactEmail && <Text size="sm">{config.contactEmail}</Text>}
              {config.contactPhone && <Text size="sm">{config.contactPhone}</Text>}
              {footer.showSocialLinks && (
                <Group gap="md" mt="xs">
                  {socialLinks.instagram && (
                    <Text size="sm" component={Link} href={socialLinks.instagram} c="inherit">
                      Instagram
                    </Text>
                  )}
                  {socialLinks.tiktok && (
                    <Text size="sm" component={Link} href={socialLinks.tiktok} c="inherit">
                      TikTok
                    </Text>
                  )}
                  {socialLinks.facebook && (
                    <Text size="sm" component={Link} href={socialLinks.facebook} c="inherit">
                      Facebook
                    </Text>
                  )}
                </Group>
              )}
            </Stack>

            {footer.showNewsletter && (
              <Stack gap="xs" maw={300}>
                <Text
                  className={jetbrainsMono.className}
                  size="xs"
                  style={{
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  Newsletter
                </Text>
                <Group gap={0} wrap="nowrap">
                  <TextInput
                    placeholder="tu@email.com"
                    radius={0}
                    value={newsletterEmail}
                    onChange={(event) => setNewsletterEmail(event.currentTarget.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter') void subscribeToNewsletter();
                    }}
                    styles={{
                      input: {
                        border: '1px solid #0d0d0d',
                        borderRight: 'none',
                        backgroundColor: 'transparent',
                        color: '#1b1c1c',
                      },
                    }}
                  />
                  <Button
                    className={bebasNeue.className}
                    radius={0}
                    loading={newsletterLoading}
                    onClick={() => void subscribeToNewsletter()}
                    style={{
                      letterSpacing: '0.05em',
                    }}
                  >
                    Suscribirse
                  </Button>
                </Group>
              </Stack>
            )}
          </Group>

          <Divider color="#0d0d0d" />

          <Group justify="space-between" wrap="wrap" gap="md">
            <Text size="xs" c="dimmed">
              {footer.copyrightText ||
                `© ${new Date().getFullYear()} ${(storefront.legal.legalName || config.name).replace(/\.$/, '')}. Todos los derechos reservados.`}
            </Text>
            <Group gap="md">
              <Text
                size="xs"
                c="dimmed"
                component="button"
                type="button"
                onClick={() => openCookieConsent()}
                style={{ background: 'none', border: 0, padding: 0, cursor: 'pointer', textDecoration: 'underline' }}
              >
                {t('cookies.manage')}
              </Text>
              <Text size="xs" c="dimmed">
                Visa
              </Text>
              <Text size="xs" c="dimmed">
                Mastercard
              </Text>
              <Text size="xs" c="dimmed">
                PSE
              </Text>
            </Group>
          </Group>
        </Stack>
      </Container>
    </footer>
  );
}
