'use client';

import { Group, Text } from '@mantine/core';
import { IconBolt } from '@tabler/icons-react';

export function Marquee() {
  const items = [
    'New Drop: Copa Mundo 2026',
    'Oversized Fit',
    '100% Algodón Premium',
    'Edición Limitada',
  ];

  return (
    <div
      style={{
        backgroundColor: '#6f7a4e',
        color: '#fcf9f8',
        padding: '16px 0',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          gap: '48px',
          animation: 'marquee 20s linear infinite',
        }}
      >
        {[...Array(4)].map((_, i) => (
          <Group key={i} gap="xl" wrap="nowrap">
            {items.map((item) => (
              <Text
                key={`${i}-${item}`}
                size="sm"
                style={{
                  fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}
              >
                <IconBolt size={14} style={{ marginRight: 8, verticalAlign: 'middle' }} />
                {item}
              </Text>
            ))}
          </Group>
        ))}
      </div>
      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}
