'use client';

import { Button, TextInput } from '@mantine/core';
import { useState } from 'react';

import { apiClient } from '../../lib/api';
import { getApiErrorMessage, notifyError, notifySuccess } from '../../lib/notifications';

export function StorefrontNewsletterForm({ buttonLabel = 'Suscribirme' }: { buttonLabel?: string }) {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const subscribe = async () => {
    const value = email.trim();
    if (!value) {
      notifyError({ title: 'Newsletter', message: 'Ingresá tu email.' });
      return;
    }
    setLoading(true);
    try {
      const { error } = await apiClient.POST('/newsletter/subscribe', {
        body: { email: value, source: 'storefront' },
      });
      if (error) throw error;
      notifySuccess({ title: 'Newsletter', message: 'Gracias por suscribirte.' });
      setEmail('');
    } catch (error) {
      notifyError({ title: 'No pudimos suscribirte', message: getApiErrorMessage(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 0, width: '100%', maxWidth: 420 }}>
      <TextInput
        value={email}
        onChange={(event) => setEmail(event.currentTarget.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') void subscribe();
        }}
        placeholder="tu@email.com"
        aria-label="Email para newsletter"
        styles={{
          input: {
            border: 'var(--sf-border-width, 1px) solid var(--sf-color-border, #0d0d0d)',
            borderRight: 'none',
            borderRadius: 'var(--sf-radius, 0) 0 0 var(--sf-radius, 0)',
            backgroundColor: 'transparent',
            color: 'var(--sf-color-text, #1b1c1c)',
          },
        }}
      />
      <Button
        onClick={() => void subscribe()}
        loading={loading}
        radius={0}
        styles={{
          root: {
            borderRadius: '0 var(--sf-radius, 0) var(--sf-radius, 0) 0',
            backgroundColor: 'var(--sf-color-brand, #0d0d0d)',
            color: 'var(--sf-color-inverse, #fcf9f8)',
            fontFamily: 'var(--sf-font-body, sans-serif)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            fontSize: 12,
            whiteSpace: 'nowrap',
          },
        }}
      >
        {buttonLabel}
      </Button>
    </div>
  );
}
