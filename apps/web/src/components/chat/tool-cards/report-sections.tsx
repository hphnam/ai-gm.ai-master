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
        <h4 className="font-mono-ledger text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--mono-muted)]">
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
      ? 'text-[var(--ledger-green)]'
      : kpi.trend?.direction === 'down'
        ? 'text-[var(--clay)]'
        : 'text-[var(--mono-muted)]'
  return (
    <div className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-[var(--hairline)] bg-[#fcfaf3] p-[14px]">
      <span className="font-mono-ledger text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--mono-muted)]">
        {kpi.label}
      </span>
      <span className="font-mono-ledger text-[24px] font-bold leading-none tracking-[-0.5px] text-[var(--ink-text)] break-words">
        {fmtKpi(kpi.value)}
      </span>
      {kpi.trend ? (
        <span
          className={cn(
            'inline-flex items-center gap-1 font-mono-ledger text-[11px] font-medium',
            trendTone,
          )}
        >
          <TrendIcon className="h-3 w-3" aria-hidden />
          {kpi.trend.percent != null
            ? `${kpi.trend.percent > 0 ? '+' : ''}${kpi.trend.percent}%`
            : ''}
          {kpi.trend.label ? (
            <span className="ml-0.5 font-sans text-[var(--mono-muted)]">{kpi.trend.label}</span>
          ) : null}
        </span>
      ) : null}
      {kpi.sublabel && !kpi.trend ? (
        <span className="text-[11px] text-[var(--mono-muted)]">{kpi.sublabel}</span>
      ) : null}
    </div>
  )
}

const TONE_CLASSES: Record<NonNullable<BarRow['tone']>, string> = {
  neutral: 'bg-[var(--brass)]',
  positive: 'bg-[var(--ledger-green)]',
  warning: 'bg-[var(--warning)]',
  negative: 'bg-[var(--clay)]',
}

const TONE_TRACK: Record<NonNullable<BarRow['tone']>, string> = {
  neutral: 'bg-[rgba(143,107,31,0.14)]',
  positive: 'bg-[rgba(47,93,61,0.14)]',
  warning: 'bg-[rgba(181,138,62,0.16)]',
  negative: 'bg-[rgba(154,75,44,0.14)]',
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
        <h4 className="font-mono-ledger text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--mono-muted)]">
          {title}
        </h4>
      ) : null}
      {caption ? <p className="text-[11.5px] text-[var(--mono-muted)]">{caption}</p> : null}
      <ul className="flex flex-col gap-2">
        {rows.map((r, i) => {
          const widthPct = Math.max(2, (Math.abs(r.value) / max) * 100)
          const tone = r.tone ?? 'neutral'
          return (
            // biome-ignore lint/suspicious/noArrayIndexKey: bar rows render from a frozen spec; order is fixed
            <li key={`bar-${i}`} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2 text-[13px]">
                <span className="truncate text-[var(--ink-text)]">{r.label}</span>
                <span className="shrink-0 font-mono-ledger text-[var(--ink-text)]">
                  {formatValue ? (
                    formatValue(r.value)
                  ) : (
                    <>
                      {r.value.toLocaleString()}
                      {unit ? <span className="ml-1 text-[var(--mono-muted)]">{unit}</span> : null}
                    </>
                  )}
                </span>
              </div>
              <div className={cn('h-1 w-full overflow-hidden rounded-full', TONE_TRACK[tone])}>
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
                <span className="text-[11px] text-[var(--mono-muted)]">{r.sublabel}</span>
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
        <h4 className="font-mono-ledger text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--mono-muted)]">
          {title}
        </h4>
      ) : null}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-[var(--hairline)]">
              {columns.map((col, j) => (
                <th
                  key={col}
                  className={cn(
                    'px-2 py-1.5 font-mono-ledger text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--mono-muted)]',
                    j === 0 ? 'text-left' : 'text-right',
                  )}
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: table rows render from a frozen spec; order is fixed
              <tr key={`r-${i}`} className="border-b border-[var(--hairline-soft)] last:border-b-0">
                {row.map((cell, j) => (
                  <td
                    key={columns[j] ?? String(cell ?? '')}
                    className={cn(
                      'px-2 py-2 align-top',
                      j === 0
                        ? 'text-[var(--ink-muted)]'
                        : 'text-right font-mono-ledger text-[var(--ink-text)]',
                    )}
                  >
                    {cell === null ? <span className="text-[var(--mono-muted)]">—</span> : cell}
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
