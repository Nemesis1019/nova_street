'use client';

import { Text, type TextProps } from '@mantine/core';

import { useCurrency } from '../providers/currency-provider';

interface PriceTextProps extends TextProps {
  amount: number;
  component?: 'span';
}

export function PriceText({ amount, ...props }: PriceTextProps) {
  const { format } = useCurrency();
  return <Text {...props}>{format(amount)}</Text>;
}
