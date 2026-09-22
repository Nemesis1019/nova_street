'use client';

import { Button, Modal, Stack, Text, Title } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import Link from 'next/link';
import { useEffect, useState } from 'react';

import { parseStorefrontConfig } from '../lib/storefront-config';
import { useStoreConfig } from '../providers/config-provider';

const SHOWN_POPUPS_KEY = 'nova-shown-popups';

function getShownPopups(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    return JSON.parse(localStorage.getItem(SHOWN_POPUPS_KEY) ?? '[]') as string[];
  } catch {
    return [];
  }
}

function markPopupShown(id: string) {
  if (typeof window === 'undefined') return;
  const shown = new Set(getShownPopups());
  shown.add(id);
  localStorage.setItem(SHOWN_POPUPS_KEY, JSON.stringify([...shown]));
}

export function Popups() {
  const config = useStoreConfig();
  const storefront = parseStorefrontConfig(config.storefrontConfig);
  const popups = storefront.popups.filter((p) => p.enabled);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [opened, { open, close }] = useDisclosure(false);

  useEffect(() => {
    if (popups.length === 0) return;

    const shown = getShownPopups();
    const nextIndex = popups.findIndex((p) => !p.showOnce || !shown.includes(p.id));
    if (nextIndex === -1) return;

    const popup = popups[nextIndex];
    setCurrentIndex(nextIndex);

    if (popup.trigger === 'immediate') {
      open();
      if (popup.showOnce) markPopupShown(popup.id);
    } else if (popup.trigger === 'afterDelay') {
      const timer = setTimeout(() => {
        open();
        if (popup.showOnce) markPopupShown(popup.id);
      }, popup.delaySeconds * 1000);
      return () => clearTimeout(timer);
    } else if (popup.trigger === 'scroll') {
      const handleScroll = () => {
        const scrollPercent = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
        if (scrollPercent >= popup.scrollPercent) {
          open();
          if (popup.showOnce) markPopupShown(popup.id);
          window.removeEventListener('scroll', handleScroll);
        }
      };
      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [popups, open]);

  if (popups.length === 0) return null;

  const popup = popups[currentIndex];
  if (!popup) return null;

  return (
    <Modal
      opened={opened}
      onClose={close}
      centered
      withCloseButton
      styles={{
        content: {
          backgroundColor: popup.backgroundColor,
          color: popup.textColor,
        },
      }}
    >
      <Stack gap="md" style={{ padding: '16px 8px' }}>
        {popup.title && (
          <Title order={3} style={{ fontFamily: 'var(--font-bebas-neue)', color: popup.textColor }}>
            {popup.title}
          </Title>
        )}
        {popup.content && (
          <Text size="sm" style={{ color: popup.textColor, lineHeight: 1.6 }}>
            {popup.content}
          </Text>
        )}
        {popup.buttonText && (
          <Button
            component={Link}
            href={popup.buttonLink || '#'}
            onClick={close}
            style={{
              backgroundColor: popup.textColor,
              color: popup.backgroundColor,
              fontFamily: 'var(--font-bebas-neue)',
            }}
          >
            {popup.buttonText}
          </Button>
        )}
      </Stack>
    </Modal>
  );
}
