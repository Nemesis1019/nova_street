'use client';

import { Area, Bar, CartesianGrid, ComposedChart, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

import { useTranslation } from '../providers/i18n-provider';

export interface TrendPoint {
  date: string;
  orders: number;
  revenue: number;
}

function formatDay(date: string) {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return parsed
    .toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
    .replace('.', '')
    .replace(/^\w/, (letter) => letter.toUpperCase());
}

function formatCurrency(value: number) {
  return `$${value.toLocaleString('es-CO')}`;
}

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ payload: TrendPoint }>;
}

function ChartTooltip({ active, payload }: TooltipProps) {
  const { t } = useTranslation();
  if (!active || !payload?.length) return null;
  const point = payload[0].payload;
  return (
    <div className="rounded-lg border border-outline-variant/40 bg-surface-container-lowest px-3 py-2 shadow-pop">
      <div className="font-label-uppercase text-label-uppercase uppercase text-on-surface-variant">
        {formatDay(point.date)}
      </div>
      <div className="mt-1 flex items-center gap-2 font-numeric-tabular text-label-sm text-on-surface">
        <span className="h-2 w-2 rounded-sm bg-primary" />
        {t('pages.dashboard.tooltipRevenue')} {formatCurrency(point.revenue)}
      </div>
      <div className="mt-0.5 flex items-center gap-2 font-numeric-tabular text-label-sm text-secondary">
        <span className="h-0.5 w-3 bg-secondary" />
        {t('pages.dashboard.tooltipOrders')} {point.orders}
      </div>
    </div>
  );
}

export function TrendsChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="relative h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="revenueGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#141b2b" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#141b2b" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#e9edff" strokeDasharray="4 4" />
          <XAxis
            dataKey="date"
            tickFormatter={formatDay}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#747878', fontSize: 12 }}
            dy={8}
            minTickGap={24}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(233, 237, 255, 0.45)' }} />
          <Bar dataKey="orders" fill="#dce2f7" radius={[3, 3, 0, 0]} maxBarSize={28} />
          <Area
            type="monotone"
            dataKey="revenue"
            stroke="#141b2b"
            strokeWidth={2.5}
            fill="url(#revenueGradient)"
            dot={{ r: 3.5, fill: '#ffffff', stroke: '#141b2b', strokeWidth: 2 }}
            activeDot={{ r: 4.5 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
