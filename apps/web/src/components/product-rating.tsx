import { Text } from '@mantine/core';

interface ProductRatingProps {
  averageRating?: number;
  reviewCount?: number;
  size?: 'sm' | 'md';
}

export function ProductRating({ averageRating, reviewCount, size = 'sm' }: ProductRatingProps) {
  if (!reviewCount || reviewCount === 0) return null;

  return (
    <Text
      size={size}
      style={{
        fontFamily: 'var(--font-jetbrains-mono), JetBrains Mono, monospace',
        color: '#5f5f58',
      }}
    >
      ★ {averageRating?.toFixed(1)} ({reviewCount} reseña{reviewCount === 1 ? '' : 's'})
    </Text>
  );
}
