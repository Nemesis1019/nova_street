'use client';

import { useEffect, useState } from 'react';

export function StorefrontCountdown({
  title,
  targetAt,
  finishedLabel,
  backgroundColor,
  textColor,
}: {
  title: string;
  targetAt: string;
  finishedLabel: string;
  backgroundColor: string;
  textColor: string;
}) {
  const target = targetAt ? new Date(targetAt).getTime() : null;
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!target || !Number.isFinite(target)) return;
    const update = () => setRemaining(Math.max(0, target - Date.now()));
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, [target]);

  if (!target || !Number.isFinite(target)) return null;

  if (remaining === 0) {
    return (
      <section style={{ padding: '72px 24px', backgroundColor, color: textColor, textAlign: 'center' }}>
        <div style={{ maxWidth: 900, margin: '0 auto' }}>
          <h2
            style={{
              margin: 0,
              fontFamily: 'var(--sf-font-display, serif)',
              fontSize: 'clamp(2rem, 4vw, 3.5rem)',
              lineHeight: 1,
            }}
          >
            {finishedLabel}
          </h2>
        </div>
      </section>
    );
  }

  const days = remaining === null ? null : Math.floor(remaining / 86_400_000);
  const hours = remaining === null ? null : Math.floor((remaining % 86_400_000) / 3_600_000);
  const minutes = remaining === null ? null : Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = remaining === null ? null : Math.floor((remaining % 60_000) / 1000);
  const cells = [
    { value: days, label: 'Días' },
    { value: hours, label: 'Horas' },
    { value: minutes, label: 'Min' },
    { value: seconds, label: 'Seg' },
  ];

  return (
    <section style={{ padding: '72px 24px', backgroundColor, color: textColor, textAlign: 'center' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <h2
          style={{
            margin: 0,
            fontFamily: 'var(--sf-font-display, serif)',
            fontSize: 'clamp(2rem, 4vw, 3.8rem)',
            lineHeight: 0.98,
            letterSpacing: '-0.02em',
          }}
        >
          {title}
        </h2>
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: 12,
            flexWrap: 'wrap',
            marginTop: 28,
          }}
        >
          {cells.map((cell) => (
            <div
              key={cell.label}
              style={{
                minWidth: 76,
                padding: '14px 10px',
                border: '1px solid currentColor',
                textAlign: 'center',
              }}
            >
              <span
                style={{
                  display: 'block',
                  fontFamily: 'var(--sf-font-mono, monospace)',
                  fontSize: 28,
                  lineHeight: 1,
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {cell.value === null ? '--' : String(cell.value).padStart(2, '0')}
              </span>
              <span
                style={{
                  display: 'block',
                  marginTop: 6,
                  fontFamily: 'var(--sf-font-mono, monospace)',
                  fontSize: 10,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  opacity: 0.7,
                }}
              >
                {cell.label}
              </span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
