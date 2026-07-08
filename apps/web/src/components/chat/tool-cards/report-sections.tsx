'use client'

import { ArrowDownRight, ArrowRight, ArrowUpRight } from 'lucide-react'
import { cn } from '@/lib/utils'

// Shared section primitives for tool-result cards. The ReportCard (built from a
// server-authored spec) and the POS numeric cards both render KPI tiles, bars,
// and tables from these — one visual language for every structured answer.

export type Money = { value: number; currency: string | null }
export type KpiValue = string | number | Money

export type Trend = {
  direction: 'up' | 'down' | 'flat'
  percent?: number | null
  label?: string
}

export type Kpi = {
  label: string
  value: KpiValue
  sublabel?: string
  trend?: Trend
}

export type BarRow = {
  label: string
  value: number
  sublabel?: string
  tone?: 'neutral' | 'positive' | 'warning' | 'negative'
}

const CURRENCY_SYMBOL: Record<string, string> = {
  GBP: '£',
  USD: '$',
  EUR: '€',
  JPY: '¥',
}

export function fmtMoney(m: Money): string {
  const sym = m.currency ? (CURRENCY_SYMBOL[m.currency] ?? `${m.currency} `) : ''
  // Negative money keeps the sign on the OUTSIDE of the symbol (-£12.34) so
  // refund / loss values read naturally.
  const abs = Math.abs(m.value)
  const formatted = abs.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return `${m.value < 0 ? '-' : ''}${sym}${formatted}`
}

export function fmtKpi(value: KpiValue): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return value.toLocaleString()
  return fmtMoney(value)
}

export function KpiGroupSection({ title, kpis }: { title?: string; kpis: Kpi[] }) {
  return (
    <div className="flex flex-col gap-2">
      {title ? (
        <h4 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h4>
      ) : null}
      <div
        className={cn(
          'grid gap-2.5',
          kpis.length === 1 && 'grid-cols-1',
          kpis.length === 2 && 'grid-cols-2',
          kpis.length >= 3 && 'grid-cols-2 sm:grid-cols-3',
        )}
      >
        {kpis.map((k, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: KPI group renders a frozen spec; order is fixed
          <KpiCard key={`kpi-${i}`} kpi={k} />
        ))}
      </div>
    </div>
  )
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  const TrendIcon =
    kpi.trend?.direction === 'up'
      ? ArrowUpRight
      : kpi.trend?.direction === 'down'
        ? ArrowDownRight
        : ArrowRight
  const trendTone =
    kpi.trend?.direction === 'up'
      ? 'text-success'
      : kpi.trend?.direction === 'down'
        ? 'text-destructive'
        : 'text-muted-foreground'
  return (
    <div className="flex flex-col gap-1 rounded-lg border border-border/60 bg-background/40 p-3">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {kpi.label}
      </span>
      <span className="text-[18px] font-semibold leading-tight tabular-nums text-foreground">
        {fmtKpi(kpi.value)}
      </span>
      {kpi.trend ? (
        <span className={cn('inline-flex items-center gap-1 text-[11px] font-medium', trendTone)}>
          <TrendIcon className="h-3 w-3" aria-hidden />
          {kpi.trend.percent != null
            ? `${kpi.trend.percent > 0 ? '+' : ''}${kpi.trend.percent}%`
            : ''}
          {kpi.trend.label ? (
            <span className="ml-0.5 text-muted-foreground">{kpi.trend.label}</span>
          ) : null}
        </span>
      ) : null}
      {kpi.sublabel && !kpi.trend ? (
        <span className="text-[11px] text-muted-foreground">{kpi.sublabel}</span>
      ) : null}
    </div>
  )
}

const TONE_CLASSES: Record<NonNullable<BarRow['tone']>, string> = {
  neutral: 'bg-foreground/70',
  positive: 'bg-success',
  warning: 'bg-warning',
  negative: 'bg-destructive',
}

export function BarSection({
  title,
  caption,
  rows,
  unit,
  formatValue,
}: {
  title?: string
  caption?: string
  rows: BarRow[]
  unit?: string
  formatValue?: (value: number) => string
}) {
  const max = Math.max(...rows.map((r) => Math.abs(r.value)), 1)
  return (
    <div className="flex flex-col gap-2">
      {title ? (
        <h4 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h4>
      ) : null}
      {caption ? <p className="text-[11.5px] text-muted-foreground">{caption}</p> : null}
      <ul className="flex flex-col gap-1.5">
        {rows.map((r, i) => {
          const widthPct = Math.max(2, (Math.abs(r.value) / max) * 100)
          const tone = r.tone ?? 'neutral'
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: bar rows render from a frozen spec; order is fixed
            <li key={`bar-${i}`} className="flex flex-col gap-0.5">
              <div className="flex items-baseline justify-between gap-2 text-[12.5px]">
                <span className="truncate font-medium text-foreground">{r.label}</span>
                <span className="shrink-0 tabular-nums text-foreground">
                  {formatValue ? (
                    formatValue(r.value)
                  ) : (
                    <>
                      {r.value.toLocaleString()}
                      {unit ? <span className="ml-0.5 text-muted-foreground">{unit}</span> : null}
                    </>
                  )}
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className={cn(
                    'h-full rounded-full transition-all duration-300',
                    TONE_CLASSES[tone],
                  )}
                  style={{ width: `${widthPct}%` }}
                  aria-hidden
                />
              </div>
              {r.sublabel ? (
                <span className="text-[11px] text-muted-foreground">{r.sublabel}</span>
              ) : null}
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function TableSection({
  title,
  columns,
  rows,
}: {
  title?: string
  columns: string[]
  rows: Array<Array<string | number | null>>
}) {
  return (
    <div className="flex flex-col gap-2">
      {title ? (
        <h4 className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </h4>
      ) : null}
      <div className="overflow-x-auto rounded-md border border-border/60">
        <table className="w-full border-collapse text-[12.5px]">
          <thead className="bg-muted/40 text-foreground">
            <tr>
              {columns.map((col) => (
                <th
                  key={col}
                  className="px-3 py-1.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: table rows render from a frozen spec; order is fixed
              <tr key={`r-${i}`} className="border-t border-border/60">
                {row.map((cell, j) => (
                  <td
                    key={columns[j] ?? String(cell ?? '')}
                    className={cn(
                      'px-3 py-1.5 align-top',
                      typeof cell === 'number' && 'text-right tabular-nums',
                    )}
                  >
                    {cell === null ? <span className="text-muted-foreground">—</span> : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/// Compact range label for a POS window (e.g. "8 Jul → 15 Jul 2026"). Falls back
/// to a single date when the window is a point, or null when no bounds exist.
export function formatWindowRange(fromIso?: string, toIso?: string): string | null {
  if (!fromIso) return null
  const from = new Date(fromIso)
  const to = toIso ? new Date(toIso) : null
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
  if (!to) return from.toLocaleDateString(undefined, opts)
  const sameYear = from.getFullYear() === to.getFullYear()
  const fromOpts: Intl.DateTimeFormatOptions = sameYear ? { month: 'short', day: 'numeric' } : opts
  return `${from.toLocaleDateString(undefined, fromOpts)} → ${to.toLocaleDateString(undefined, opts)}`
}
