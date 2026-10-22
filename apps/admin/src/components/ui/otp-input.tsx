'use client';

import { ClipboardEvent, Fragment, KeyboardEvent, useEffect, useRef } from 'react';

const OTP_LENGTH = 6;
const GROUP_SIZE = 3;

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  /** Se dispara al completar los 6 dígitos (una sola vez por completado). */
  onComplete?: (value: string) => void;
  disabled?: boolean;
  autoFocus?: boolean;
  /** Etiqueta accesible para el grupo y cada casilla. */
  label?: string;
}

/**
 * Input OTP de 6 dígitos en cajas separadas, agrupadas de a 3 con un guion
 * en el medio (`[1][2][3] – [4][5][6]`). Soporta auto-advance, backspace,
 * flechas, pegado de un código completo y autoFocus.
 */
export function OtpInput({
  value,
  onChange,
  onComplete,
  disabled = false,
  autoFocus = false,
  label = 'OTP',
}: OtpInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const valueRef = useRef(value);

  useEffect(() => {
    valueRef.current = value;
  }, [value]);

  useEffect(() => {
    if (autoFocus) inputsRef.current[0]?.focus();
  }, [autoFocus]);

  const focusInput = (index: number) => {
    const clamped = Math.max(0, Math.min(OTP_LENGTH - 1, index));
    inputsRef.current[clamped]?.focus();
    inputsRef.current[clamped]?.select();
  };

  const commit = (raw: string) => {
    const sanitized = raw.replace(/\D/g, '').slice(0, OTP_LENGTH);
    // Actualización inmediata del ref: el guard de onFocus se dispara antes
    // de que React propague el nuevo `value` al componente.
    valueRef.current = sanitized;
    onChange(sanitized);
    return sanitized;
  };

  const completeIfNeeded = (previous: string, next: string) => {
    if (previous.length < OTP_LENGTH && next.length === OTP_LENGTH) {
      onComplete?.(next);
    }
  };

  const handleChange = (index: number, raw: string) => {
    const digit = raw.replace(/\D/g, '').slice(-1);
    if (!digit) return;
    const next = commit(`${value.slice(0, index)}${digit}${value.slice(index + 1)}`);
    focusInput(index + 1);
    completeIfNeeded(value, next);
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    if (event.key === 'Backspace') {
      event.preventDefault();
      if (!value) return;
      if (index >= value.length) {
        const next = value.slice(0, -1);
        commit(next);
        focusInput(next.length);
        return;
      }
      const next = value.slice(0, index) + value.slice(index + 1);
      commit(next);
      focusInput(Math.min(index, Math.max(0, next.length)));
      return;
    }

    if (event.key === 'Delete') {
      event.preventDefault();
      if (index >= value.length) return;
      commit(value.slice(0, index) + value.slice(index + 1));
      return;
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      focusInput(index - 1);
      return;
    }

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      focusInput(index + 1);
    }
  };

  const handlePaste = (index: number, event: ClipboardEvent<HTMLInputElement>) => {
    event.preventDefault();
    if (disabled) return;
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '');
    if (!pasted) return;
    const next = commit(`${value.slice(0, index)}${pasted}`);
    focusInput(next.length);
    completeIfNeeded(value, next);
  };

  const handleFocus = (index: number) => {
    // Evita "huecos": si se enfoca una casilla más allá de la primera vacía,
    // el foco vuelve a esa primera vacía para mantener la edición secuencial.
    // Se usa valueRef porque este handler puede dispararse antes de que el
    // `value` del render anterior se actualice (auto-advance al tipear).
    if (index > valueRef.current.length) focusInput(valueRef.current.length);
  };

  return (
    <div className="flex items-center justify-center gap-1.5" role="group" aria-label={label}>
      {Array.from({ length: OTP_LENGTH }).map((_, index) => (
        <Fragment key={index}>
          {index === GROUP_SIZE && (
            <span aria-hidden="true" className="px-0.5 font-headline-sm text-headline-sm text-on-surface-variant">
              –
            </span>
          )}
          <input
            ref={(element) => {
              inputsRef.current[index] = element;
            }}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            autoComplete={index === 0 ? 'one-time-code' : 'off'}
            aria-label={`${label} ${index + 1}`}
            value={value[index] ?? ''}
            disabled={disabled}
            onChange={(event) => handleChange(index, event.currentTarget.value)}
            onKeyDown={(event) => handleKeyDown(index, event)}
            onPaste={(event) => handlePaste(index, event)}
            onFocus={() => handleFocus(index)}
            className="h-12 w-10 rounded-lg border border-outline-variant/50 bg-surface-container-lowest text-center font-mono text-[18px] font-semibold text-on-surface transition-colors focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
          />
        </Fragment>
      ))}
    </div>
  );
}
