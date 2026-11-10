'use client';

import { useEffect, useState } from 'react';

export function MarqueeTrack({
  children,
  duration,
  direction,
  pausedByDefault,
  allowControl,
  label,
}: {
  children: React.ReactNode;
  duration: number;
  direction: 'normal' | 'reverse';
  pausedByDefault: boolean;
  allowControl: boolean;
  label: string;
}) {
  const [paused, setPaused] = useState(pausedByDefault);

  useEffect(() => {
    setPaused(pausedByDefault);
  }, [pausedByDefault]);

  return (
    <>
      <div
        className={`sf-marquee-track${paused ? ' is-paused' : ''}`}
        style={{
          animationDuration: `${duration}s`,
          animationDirection: direction,
        }}
      >
        {children}
      </div>
      {allowControl ? (
        <button
          type="button"
          className="sf-marquee-control"
          aria-label={paused ? `Reproducir ${label}` : `Pausar ${label}`}
          aria-pressed={paused}
          onClick={() => setPaused((value) => !value)}
        >
          {paused ? '▶' : '❚❚'}
        </button>
      ) : null}
    </>
  );
}
