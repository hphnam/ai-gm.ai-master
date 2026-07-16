'use client'

import { Bar, BarChart, XAxis } from 'recharts'
import {
  type ChartConfig,
  ChartContainer,
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
  error: { label: 'Errored', color: 'var(--chart-3)' },
} satisfies ChartConfig

/// One thin stacked bar per day — answered anchors the bottom, no-data in the
/// middle, errored on top. Sums to "total searches that day"; the reader sees
/// both absolute load and the failure share at a glance.
export function SearchOutcomesChart({ buckets }: { buckets: Bucket[] }) {
  return (
    <ChartContainer config={CONFIG} className="h-[220px] w-full">
      <BarChart
        data={buckets}
        margin={{ left: 4, right: 4, top: 8, bottom: 0 }}
        barCategoryGap="18%"
        maxBarSize={18}
        accessibilityLayer
      >
        <XAxis
          dataKey="date"
          tickFormatter={formatShortDate}
          tickLine={false}
          axisLine={false}
          minTickGap={16}
          tick={{
            fill: 'var(--mono-muted)',
            fontSize: 9,
            fontFamily: 'var(--font-spline-mono), ui-monospace, monospace',
          }}
        />
        <ChartTooltip
          content={<ChartTooltipContent labelFormatter={(v) => formatShortDate(String(v))} />}
        />
        <Bar
          dataKey="hit"
          name="Answered"
          fill="var(--color-hit)"
          stackId="a"
          radius={[0, 0, 2, 2]}
        />
        <Bar dataKey="noData" name="No data" fill="var(--color-noData)" stackId="a" />
        <Bar
          dataKey="error"
          name="Errored"
          fill="var(--color-error)"
          stackId="a"
          radius={[2, 2, 0, 0]}
        />
      </BarChart>
    </ChartContainer>
  )
}
