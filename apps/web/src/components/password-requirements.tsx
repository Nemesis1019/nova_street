'use client';

import { getPasswordRuleResults } from '@ecommerce/shared';
import { IconCheck, IconX } from '@tabler/icons-react';

interface PasswordRequirementsProps {
  /** Valor actual del input de contraseña (en tiempo real). */
  value: string;
  /** No mostrar las reglas ya cumplidas (por defecto se muestran todas con su estado). */
  onlyPending?: boolean;
}

/**
 * Checklist en vivo de la política de contraseñas: marca en verde lo cumplido
 * y en gris/rojo lo pendiente mientras el usuario escribe.
 */
export function PasswordRequirements({ value, onlyPending = false }: PasswordRequirementsProps) {
  const rules = getPasswordRuleResults(value);
  const visible = onlyPending ? rules.filter((rule) => !rule.met) : rules;

  return (
    <ul
      style={{
        listStyle: 'none',
        margin: '8px 0 0',
        padding: 0,
        display: 'grid',
        gap: 4,
      }}
      aria-live="polite"
    >
      {visible.map((rule) => (
        <li
          key={rule.id}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            fontSize: 12,
            lineHeight: 1.2,
            fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
            color: rule.met ? '#2f7d32' : '#8f8d8c',
            transition: 'color 180ms ease',
          }}
        >
          {rule.met ? (
            <IconCheck size={13} stroke={2.4} className="nova-pop" />
          ) : (
            <IconX size={13} stroke={2} />
          )}
          <span>{rule.label}</span>
        </li>
      ))}
    </ul>
  );
}

interface PasswordMatchHintProps {
  password: string;
  confirmValue: string;
}

/**
 * Comparación en vivo entre contraseña y confirmación. Solo aparece cuando el
 * usuario escribió algo en el campo de confirmación.
 */
export function PasswordMatchHint({ password, confirmValue }: PasswordMatchHintProps) {
  if (!confirmValue) return null;

  const met = password === confirmValue;

  return (
    <ul
      style={{
        listStyle: 'none',
        margin: '8px 0 0',
        padding: 0,
      }}
      aria-live="polite"
    >
      <li
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 12,
          lineHeight: 1.2,
          fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
          color: met ? '#2f7d32' : '#b3261e',
          transition: 'color 180ms ease',
        }}
      >
        {met ? (
          <IconCheck size={13} stroke={2.4} className="nova-pop" />
        ) : (
          <IconX size={13} stroke={2} />
        )}
        <span>{met ? 'Las contraseñas coinciden' : 'Las contraseñas no coinciden'}</span>
      </li>
    </ul>
  );
}
