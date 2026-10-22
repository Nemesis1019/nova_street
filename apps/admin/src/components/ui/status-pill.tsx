import { ReactNode } from 'react';

export type StatusTone = 'success' | 'warning' | 'danger' | 'neutral' | 'secondary' | 'info';

const TONES: Record<StatusTone, { wrapper: string; dot: string }> = {
  success: { wrapper: 'bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  warning: { wrapper: 'bg-amber-50 text-amber-700', dot: 'bg-amber-500' },
  danger: { wrapper: 'bg-rose-50 text-rose-700', dot: 'bg-rose-500' },
  neutral: { wrapper: 'bg-surface-container-highest text-on-surface', dot: 'bg-secondary' },
  secondary: { wrapper: 'bg-secondary-fixed text-on-secondary-fixed', dot: 'bg-primary' },
  info: { wrapper: 'bg-sky-50 text-sky-700', dot: 'bg-sky-500' },
};

interface StatusPillProps {
  label: ReactNode;
  tone?: StatusTone;
  withDot?: boolean;
  pulse?: boolean;
  className?: string;
}

export function StatusPill({ label, tone = 'neutral', withDot = true, pulse = false, className = '' }: StatusPillProps) {
  const styles = TONES[tone];
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 font-label-sm text-label-sm font-medium ${styles.wrapper} ${className}`}
    >
      {withDot && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${styles.dot} ${pulse ? 'animate-pulse' : ''}`} />}
      {label}
    </span>
  );
}
