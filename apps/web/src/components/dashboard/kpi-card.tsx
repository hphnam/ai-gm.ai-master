import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { cn } from '@/lib/utils'

type Props = {
  label: string
  value: string
  hint?: string
  icon: LucideIcon
  trend?: { direction: 'up' | 'down' | 'flat'; label: string }
  isLoading?: boolean
}

/// Compact KPI tile used in the dashboard's top strip. Trend chip is optional
/// and only appears when we have a comparable previous period — most of the
/// initial implementation passes nothing because the analytics endpoints
/// don't ship period-over-period yet.
export function KpiCard({ label, value, hint, icon: Icon, trend, isLoading }: Props) {
  return (
    <Card className="overflow-hidden">
      <CardContent className="flex flex-col gap-3 p-5">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {label}
          </span>
          <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </div>
        <div className="flex items-baseline gap-2">
          <span
            className={cn(
              'font-display text-3xl font-semibold leading-none tracking-tight tabular-nums',
              isLoading && 'animate-pulse text-muted-foreground/40',
            )}
          >
            {isLoading ? '—' : value}
          </span>
          {trend ? (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium',
                trend.direction === 'up' && 'bg-chart-1/15 text-chart-1',
                trend.direction === 'down' && 'bg-chart-3/15 text-chart-3',
                trend.direction === 'flat' && 'bg-muted text-muted-foreground',
              )}
            >
              {trend.direction === 'up' ? (
                <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
              ) : trend.direction === 'down' ? (
                <ArrowDownRight className="h-3 w-3" aria-hidden="true" />
              ) : null}
              {trend.label}
            </span>
          ) : null}
        </div>
        {hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </CardContent>
    </Card>
  )
}
