'use client';

import { Button } from '@mantine/core';

import { useComparator } from '../hooks/use-comparator';

interface CompareButtonProps {
  slug: string;
}

export function CompareButton({ slug }: CompareButtonProps) {
  const { isSelected, toggle } = useComparator();
  const selected = isSelected(slug);

  return (
    <Button
      variant={selected ? 'filled' : 'outline'}
      size="xs"
      fullWidth
      onClick={() => toggle(slug)}
      style={{
        borderColor: '#0d0d0d',
        color: selected ? '#fcf9f8' : '#0d0d0d',
        backgroundColor: selected ? '#0d0d0d' : 'transparent',
        fontFamily: 'var(--font-bebas-neue)',
      }}
    >
      {selected ? 'Comparando' : 'Comparar'}
    </Button>
  );
}
