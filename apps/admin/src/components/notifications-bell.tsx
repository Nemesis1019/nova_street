'use client';

import { ActionIcon, Badge, Menu, Text } from '@mantine/core';
import { useEffect, useState } from 'react';

import { getAuthToken } from '../lib/api';

interface AdminEvent {
  type: string;
  title: string;
  message: string;
  data?: unknown;
  createdAt: string;
}

export function NotificationsBell() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const token = getAuthToken();
    const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
    const url = `${baseUrl}/admin/notifications/stream?token=${encodeURIComponent(token ?? '')}`;
    const source = new EventSource(url);

    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as AdminEvent;
        setEvents((current) => [event, ...current].slice(0, 50));
      } catch {
        // ignore malformed events
      }
    };

    source.onerror = () => {
      // Auto-reconnect is handled by EventSource
    };

    return () => {
      source.close();
    };
  }, []);

  const unreadCount = events.length;

  return (
    <Menu opened={isOpen} onChange={setIsOpen} position="bottom-end" shadow="md">
      <Menu.Target>
        <ActionIcon variant="light" size="lg" aria-label="Notificaciones">
          <span style={{ fontSize: 18 }}>🔔</span>
          {unreadCount > 0 && (
            <Badge
              size="xs"
              color="red"
              style={{
                position: 'absolute',
                top: -2,
                right: -2,
                padding: '0 4px',
                minWidth: 18,
                height: 18,
                fontSize: 10,
              }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </Badge>
          )}
        </ActionIcon>
      </Menu.Target>
      <Menu.Dropdown style={{ width: 320 }}>
        <Menu.Label>Notificaciones en tiempo real</Menu.Label>
        {events.length === 0 && (
          <Menu.Item disabled>
            <Text size="sm">Sin notificaciones recientes</Text>
          </Menu.Item>
        )}
        {events.map((event, index) => (
          <Menu.Item key={index}>
            <Text size="sm" fw={500}>
              {event.title}
            </Text>
            <Text size="xs" c="dimmed">
              {event.message}
            </Text>
            <Text size="xs" c="dimmed">
              {new Date(event.createdAt).toLocaleTimeString()}
            </Text>
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
            Limpiar notificaciones
          </Menu.Item>
        )}
      </Menu.Dropdown>
    </Menu>
  );
}
