'use client'

import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'

type Week = {
  weekStart: string
  weekEnd: string
  activeUsers: number
  messageCount: number
}

const CONFIG = {
  activeUsers: { label: 'Active staff', color: 'var(--chart-1)' },
} satisfies ChartConfig

function formatWeek(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(d)
}

/// Weekly active staff for a single venue. Smoothed area emphasises trend
/// over week-to-week noise — operators look at this to confirm adoption is
/// growing, not to compare individual weeks.
export function WauChart({ weeks }: { weeks: Week[] }) {
  return (
    <ChartContainer config={CONFIG} className="h-[220px] w-full">
      <AreaChart
        data={weeks}
        margin={{ left: 4, right: 12, top: 12, bottom: 0 }}
        accessibilityLayer
      >
        <defs>
          <linearGradient id="wau-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="var(--color-activeUsers)" stopOpacity={0.4} />
            <stop offset="95%" stopColor="var(--color-activeUsers)" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" />
        <XAxis
          dataKey="weekStart"
          tickFormatter={formatWeek}
          tickLine={false}
          axisLine={false}
          minTickGap={28}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
        />
        <YAxis
          tickLine={false}
          axisLine={false}
          width={28}
          allowDecimals={false}
          tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
        />
        <ChartTooltip
          content={
            <ChartTooltipContent
              labelFormatter={(v) => `Week of ${formatWeek(String(v))}`}
              formatter={(value, _name, item) => {
                const msgs = (item?.payload as Week | undefined)?.messageCount ?? 0
                return `${value} staff · ${msgs} messages`
              }}
            />
          }
        />
        <Area
          type="monotone"
          dataKey="activeUsers"
          name="Active staff"
          stroke="var(--color-activeUsers)"
          fill="url(#wau-fill)"
          strokeWidth={2}
        />
      </AreaChart>
    </ChartContainer>
  )
}
