'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { ReactNode } from 'react';

import { LAYOUT_SPRING } from './motion';

export interface SegmentedTabOption<T extends string> {
  value: T;
  label: ReactNode;
}

interface SegmentedTabsProps<T extends string> {
  value: T;
  options: ReadonlyArray<SegmentedTabOption<T>>;
  onChange: (value: T) => void;
  /** `primary` = pill negro con texto blanco; `soft` = pill blanco con sombra. */
  variant?: 'primary' | 'soft';
  size?: 'sm' | 'md';
  /** Identificador único del control (para que el indicador se deslice). */
  layoutId: string;
  className?: string;
}

/**
 * Control segmentado con indicador activo deslizante (framer-motion layoutId).
 * Reemplaza los tabs/filtros que antes cambiaban de fondo de golpe.
 */
export function SegmentedTabs<T extends string>({
  value,
  options,
  onChange,
  variant = 'soft',
  size = 'sm',
  layoutId,
  className = '',
}: SegmentedTabsProps<T>) {
  const reduceMotion = useReducedMotion();
  const padding = size === 'sm' ? 'px-3 py-1 font-label-sm text-label-sm' : 'px-3.5 py-1.5 font-label-md text-label-md';

  return (
    <div className={`flex items-center gap-1 rounded-lg bg-surface-container-low p-1 ${className}`}>
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            aria-pressed={active}
            className={`relative rounded-md transition-colors ${padding} ${
              active
                ? variant === 'primary'
                  ? 'text-on-primary'
                  : 'font-semibold text-on-surface'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={reduceMotion ? { duration: 0 } : LAYOUT_SPRING}
                className={`absolute inset-0 rounded-md ${
                  variant === 'primary' ? 'bg-primary shadow-sm' : 'bg-surface-container-lowest shadow-sm'
                }`}
              />
            )}
            <span className="relative z-10 flex items-center whitespace-nowrap">{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}
