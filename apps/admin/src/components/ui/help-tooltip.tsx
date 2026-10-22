'use client';

import { Tooltip } from '@mantine/core';

import { Icon } from './icon';

interface HelpTooltipProps {
  text: string;
  className?: string;
}

/**
 * Icono de ayuda con leyenda al hover/focus. Se usa junto al label de campos
 * cuyo nombre no explica del todo qué hacen (slug, SKU, ajustes de precio...).
 */
export function HelpTooltip({ text, className = '' }: HelpTooltipProps) {
  if (!text) return null;

  return (
    <Tooltip
      label={text}
      multiline
      w={280}
      withArrow
      position="top"
      openDelay={150}
      events={{ hover: true, focus: true, touch: true }}
    >
      <span
        tabIndex={0}
        aria-label={text}
        className={`inline-flex cursor-help items-center text-on-surface-variant/70 transition-colors hover:text-on-surface focus:outline-none focus-visible:text-on-surface ${className}`}
      >
        <Icon name="help_outline" className="text-[14px]" />
      </span>
    </Tooltip>
  );
}
