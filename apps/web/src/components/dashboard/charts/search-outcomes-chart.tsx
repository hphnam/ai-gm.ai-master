'use client'

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { formatShortDate } from '../format'

type Bucket = {
  date: string
  hit: number
  noData: number
  error: number
}

const CONFIG = {
  hit: { label: 'Answered', color: 'var(--chart-1)' },
  noData: { label: 'No data', color: 'var(--chart-2)' },
  error: { label: 'Error', color: 'var(--chart-3)' },
} satisfies ChartConfig

/// Search-outcome distribution per day. Stacked area is the right shape here
/// because the three series sum to "total searches that day" and we want the
/// reader to see both absolute load and the no-data share at once. Hit on
/// the bottom anchors the eye to the positive signal.
export function SearchOutcomesChart({ buckets }: { buckets: Bucket[] }) {
  return (
    <ChartContainer config={CONFIG} className="h-[220px] w-full">
      <AreaChart
        data={buckets}
        margin={{ left: 4, right: 12, top: 12, bottom: 0 }}
        accessibilityLayer
      >
        <defs>
          {(['hit', 'noData', 'error'] as const).map((k) => (
            <linearGradient key={k} id={`so-${k}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={`var(--color-${k})`} stopOpacity={0.55} />
              <stop offset="95%" stopColor={`var(--color-${k})`} stopOpacity={0.05} />
            </linearGradient>
          ))}
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="date"
          tickFormatter={formatShortDate}
          tickLine={false}
          axisLine={false}
          minTickGap={28}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={32}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
        />
        <ChartTooltip
          content={<ChartTooltipContent labelFormatter={(v) => formatShortDate(String(v))} />}
        />
        <Area
          type="monotone"
          dataKey="hit"
          name="Answered"
          stroke="var(--color-hit)"
          fill="url(#so-hit)"
          stackId="1"
        />
        <Area
          type="monotone"
          dataKey="noData"
          name="No data"
          stroke="var(--color-noData)"
          fill="url(#so-noData)"
          stackId="1"
        />
        <Area
          type="monotone"
          dataKey="error"
          name="Error"
          stroke="var(--color-error)"
          fill="url(#so-error)"
          stackId="1"
        />
        <ChartLegend content={<ChartLegendContent />} verticalAlign="bottom" />
      </AreaChart>
    </ChartContainer>
  )
}
