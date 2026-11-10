'use client';

import { useEffect, useRef } from 'react';

import type { ExperimentVariant } from '../../lib/storefront-experiment';
import { resolveTenantSlug } from '../../lib/tenant';

type ExperimentEvent = 'impression' | 'cta_click';

async function sendExperimentEvent(
  experimentId: string,
  variant: ExperimentVariant,
  event: ExperimentEvent,
) {
  try {
    const tenant = await resolveTenantSlug();
    await fetch(
      `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'}/storefront/experiment-event`,
      {
        method: 'POST',
        credentials: 'include',
        keepalive: true,
        headers: {
          'Content-Type': 'application/json',
          ...(tenant ? { 'X-Tenant': tenant } : {}),
        },
        body: JSON.stringify({
          experimentId,
          variant,
          event,
          path: window.location.pathname,
        }),
      },
    );
  } catch {
    // La analítica no debe bloquear ni romper la tienda.
  }
}

export function ExperimentTracker({
  experimentId,
  variant,
}: {
  experimentId: string;
  variant: ExperimentVariant;
}) {
  const impressionSent = useRef(false);

  useEffect(() => {
    if (impressionSent.current) return;
    impressionSent.current = true;
    void sendExperimentEvent(experimentId, variant, 'impression');

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest('[data-nova-hero] a')) return;
      void sendExperimentEvent(experimentId, variant, 'cta_click');
    };

    document.addEventListener('click', onClick);
    return () => document.removeEventListener('click', onClick);
  }, [experimentId, variant]);

  return null;
}
