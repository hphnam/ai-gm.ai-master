import type { LucideIcon } from 'lucide-react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  label: string
  value: string
  hint?: string
  icon: LucideIcon
  trend?: { direction: 'up' | 'down' | 'flat'; label: string }
  isLoading?: boolean
  /// Renders the figure in ledger green — for headline positive metrics
  /// (e.g. resolution rate).
  positive?: boolean
}

/// Compact KPI tile used in the dashboard's top strip. Trend chip is optional
/// and only appears when we have a comparable previous period — most of the
/// initial implementation passes nothing because the analytics endpoints
/// don't ship period-over-period yet.
export function KpiCard({ label, value, hint, icon: Icon, trend, isLoading, positive }: Props) {
  return (
    <div className="rounded-xl border border-[var(--hairline)] bg-[var(--ledger-card)] p-[18px]">
      <div className="mb-3.5 flex items-center gap-2">
        <span className="grid size-[26px] shrink-0 place-items-center rounded-md bg-[rgba(143,107,31,0.12)] text-[var(--brass)]">
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        </span>
        <span className="font-mono-ledger text-[10.5px] font-semibold uppercase tracking-wider text-[var(--mono-muted)]">
          {label}
        </span>
      </div>
      <div className="flex items-baseline gap-2">
        <span
          className={cn(
            'font-mono-ledger text-[30px] font-bold leading-none tracking-[-1px] tabular-nums',
            positive ? 'text-[var(--ledger-green)]' : 'text-[var(--ink-text)]',
            isLoading && 'animate-pulse text-[var(--mono-muted)]/40',
          )}
        >
          {isLoading ? '—' : value}
        </span>
        {trend ? (
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-mono-ledger text-[11px] font-medium',
              trend.direction === 'up' && 'bg-[rgba(47,93,61,0.12)] text-[var(--ledger-green)]',
              trend.direction === 'down' && 'bg-[rgba(154,75,44,0.12)] text-[var(--clay)]',
              trend.direction === 'flat' && 'bg-[var(--paper-2)] text-[var(--mono-muted)]',
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
      {hint ? (
        <p className="mt-[7px] text-[11.5px] leading-[1.4] text-[var(--mono-muted)]">{hint}</p>
      ) : null}
    </div>
  )
}
