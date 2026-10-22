'use client';

import { Menu } from '@mantine/core';
import { motion, useReducedMotion } from 'framer-motion';
import { useEffect, useState } from 'react';

import { getAuthToken } from '../lib/api';
import { getAdminTenantSlug } from '../lib/tenant';
import { useTranslation } from '../providers/i18n-provider';
import { Icon } from './ui/icon';

interface AdminEvent {
  type: string;
  title: string;
  message: string;
  data?: unknown;
  createdAt: string;
}

export function NotificationsBell() {
  const { t } = useTranslation();
  const reduceMotion = useReducedMotion();
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    let source: EventSource | null = null;
    let retryTimer: number | undefined;
    let disposed = false;

    const connect = () => {
      if (disposed) return;
      const token = getAuthToken();
      if (!token) {
        retryTimer = window.setTimeout(connect, 3000);
        return;
      }

      // EventSource no envía headers: el tenant viaja por query (?tenant=) y
      // el guard valida que coincida con el claim del token.
      source = new EventSource(
        `${baseUrl}/admin/notifications/stream?token=${encodeURIComponent(token)}&tenant=${encodeURIComponent(
          getAdminTenantSlug() ?? '',
        )}`,
      );

      source.onmessage = (message) => {
        try {
          const event = JSON.parse(message.data) as AdminEvent;
          setEvents((current) => [event, ...current].slice(0, 50));
        } catch {
          // ignore malformed events
        }
      };

      // El EventSource nativo no envía headers: al reconectar releemos el token actual
      // (puede haber rotado/refrescado mientras la conexión estaba abierta).
      source.onerror = () => {
        source?.close();
        source = null;
        if (!disposed) {
          retryTimer = window.setTimeout(connect, 3000);
        }
      };
    };

    connect();

    return () => {
      disposed = true;
      if (retryTimer) window.clearTimeout(retryTimer);
      source?.close();
    };
  }, []);

  const unreadCount = events.length;

  return (
    <Menu
      opened={isOpen}
      onChange={setIsOpen}
      position="bottom-end"
      shadow="md"
      width={320}
      transitionProps={{ transition: 'pop', duration: 150 }}
    >
      <Menu.Target>
        <button
          type="button"
          aria-label={t('pages.notifications.ariaLabel')}
          className="relative flex items-center justify-center rounded-lg bg-primary p-2 text-on-primary transition-colors hover:bg-primary/90"
        >
          <Icon name="notifications" className="text-[20px]" />
          {unreadCount > 0 && (
            <motion.span
              className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-amber-500 ring-2 ring-surface-container-lowest"
              animate={reduceMotion ? undefined : { scale: [1, 1.3, 1], opacity: [1, 0.8, 1] }}
              transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
            />
          )}
        </button>
      </Menu.Target>
      <Menu.Dropdown>
        <Menu.Label>{t('pages.notifications.realtime')}</Menu.Label>
        {events.length === 0 && (
          <Menu.Item disabled>
            <span className="font-body-sm text-body-sm">{t('pages.notifications.empty')}</span>
          </Menu.Item>
        )}
        {events.map((event, index) => (
          <Menu.Item key={index}>
            <div className="flex flex-col">
              <span className="font-body-sm text-body-sm font-medium">{event.title}</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">{event.message}</span>
              <span className="font-label-sm text-label-sm text-on-surface-variant">
                {new Date(event.createdAt).toLocaleTimeString()}
              </span>
            </div>
          </Menu.Item>
        ))}
        {events.length > 0 && (
          <Menu.Item
            color="red"
            onClick={() => {
              setEvents([]);
              setIsOpen(false);
            }}
          >
            {t('pages.notifications.clear')}
          </Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
