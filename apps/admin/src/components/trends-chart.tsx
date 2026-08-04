'use client';

import { Paper, Text, Title } from '@mantine/core';
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface TrendPoint {
  date: string;
  orders: number;
  revenue: number;
}

interface TrendsChartProps {
  data: TrendPoint[];
}

export function TrendsChart({ data }: TrendsChartProps) {
  return (
    <Paper p="md" withBorder radius="md">
      <Title order={3} mb="md">
        Tendencias (últimos 7 días)
      </Title>
      <ResponsiveContainer width="100%" height={320}>
        <ComposedChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
          <XAxis dataKey="date" tick={{ fontSize: 12 }} axisLine={{ stroke: '#E5E5E5' }} tickLine={false} />
          <YAxis
            yAxisId="left"
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
          />
          <YAxis
            yAxisId="right"
            orientation="right"
            tick={{ fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `$${value.toLocaleString()}`}
          />
          <Tooltip
            contentStyle={{
              border: '1px solid #E5E5E5',
              borderRadius: '8px',
              boxShadow: '0px 4px 12px rgba(0, 0, 0, 0.05)',
            }}
            formatter={(value, name) =>
              name === 'revenue' ? [`$${Number(value).toLocaleString()}`, 'Ingresos'] : [value, 'Órdenes']
            }
          />
          <Legend
            formatter={(value) => (value === 'revenue' ? 'Ingresos' : 'Órdenes')}
            wrapperStyle={{ paddingTop: 16 }}
          />
          <Bar yAxisId="left" dataKey="orders" fill="#000000" radius={[4, 4, 0, 0]} />
          <Line yAxisId="right" type="monotone" dataKey="revenue" stroke="#5d5f5f" strokeWidth={2} dot={false} />
        </ComposedChart>
      </ResponsiveContainer>
      {data.length === 0 && (
        <Text ta="center" c="dimmed" py="xl">
          No hay datos de tendencias disponibles.
        </Text>
      )}
    </Paper>
  );
}
