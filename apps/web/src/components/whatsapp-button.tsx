'use client';

import { ActionIcon } from '@mantine/core';
import { IconBrandWhatsapp } from '@tabler/icons-react';

import { parseStorefrontConfig } from '../lib/storefront-config';
import type { StoreConfig } from '../providers/config-provider';

interface WhatsAppButtonProps {
  config: StoreConfig;
}

export function WhatsAppButton({ config }: WhatsAppButtonProps) {
  const storefront = parseStorefrontConfig(config.storefrontConfig);
  const { enabled, phone, message, position } = storefront.whatsappButton;

  if (!enabled || !phone) return null;

  const cleanPhone = phone.replace(/\D/g, '');
  if (!cleanPhone) return null;

  const url = `https://wa.me/${cleanPhone}${message ? `?text=${encodeURIComponent(message)}` : ''}`;
  const positionStyle = position === 'bottomLeft'
    ? { left: 24, right: 'auto' }
    : { right: 24, left: 'auto' };

  return (
    <ActionIcon
      component="a"
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      size="xl"
      radius="xl"
      style={{
        position: 'fixed',
        bottom: 24,
        ...positionStyle,
        zIndex: 100,
        backgroundColor: '#25d366',
        color: '#ffffff',
      }}
      aria-label="WhatsApp"
    >
      <IconBrandWhatsapp size={32} />
    </ActionIcon>
  );
}
