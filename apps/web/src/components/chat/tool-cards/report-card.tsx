'use client'

import { ArrowDownRight, ArrowRight, ArrowUpRight, ExternalLink, FileBarChart } from 'lucide-react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'
import { CardEmpty, CardShell } from './card-shell'
import { isToolFail, isToolOk, type ToolCardRendererProps } from './types'

// Mirror of the shared ReportSpec types in apps/api/src/types/reports.ts.
// Duplicated here intentionally to avoid coupling the web app to the api
// package — the contract is the JSON shape, validated by Zod on the server.

type Money = { value: number; currency: string | null }
type KpiValue = string | number | Money

type Trend = {
  direction: 'up' | 'down' | 'flat'
  percent?: number | null
  label?: string
}

type Kpi = {
  label: string
  value: KpiValue
  sublabel?: string
  trend?: Trend
}

type BarRow = {
  label: string
  value: number
  sublabel?: string
  tone?: 'neutral' | 'positive' | 'warning' | 'negative'
}

type Section =
  | { type: 'text'; body: string }
  | { type: 'kpi'; kpi: Kpi }
  | { type: 'kpiGroup'; title?: string; kpis: Kpi[] }
  | { type: 'bar'; title?: string; caption?: string; rows: BarRow[]; unit?: string }
  | { type: 'table'; title?: string; columns: string[]; rows: Array<Array<string | number | null>> }
  | { type: 'divider'; label?: string }

type Spec = {
  version?: number
  rangeFromIso?: string
  rangeToIso?: string
  sections: Section[]
}

type ReportData = {
  id: string
  title: string
  summary: string | null
  venueId: string | null
  spec: Spec
  createdAt: string
  url: string
}

const CURRENCY_SYMBOL: Record<string, string> = {
  GBP: '£',
  USD: '$',
  EUR: '€',
  JPY: '¥',
}

function fmtMoney(m: Money): string {
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

function fmtKpi(value: KpiValue): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number') return value.toLocaleString()
  return fmtMoney(value)
}

function fmtRange(fromIso?: string, toIso?: string): string | null {
  if (!fromIso) return null
  const from = new Date(fromIso)
  const to = toIso ? new Date(toIso) : null
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric', year: 'numeric' }
  if (!to) return from.toLocaleDateString(undefined, opts)
  return `${from.toLocaleDateString(undefined, opts)} → ${to.toLocaleDateString(undefined, opts)}`
}

export function ReportCard({ part }: ToolCardRendererProps) {
  const output = part.output
  if (isToolFail(output)) {
    return (
      <CardShell icon={FileBarChart} title="Report">
        <CardEmpty
          message={
            output.detail === 'venue-not-in-org'
              ? "I couldn't save that report — venue not found in your org."
              : (output.detail ?? "Couldn't generate that report.")
          }
        />
      </CardShell>
    )
  }
  if (!isToolOk<ReportData>(output)) return null
  return <ReportSurface data={output.data} compact={false} />
}

/// Standalone surface — used by both the chat tool-card and the /reports/:id
/// page. `compact` shrinks padding for the chat surface; the standalone page
/// gets the roomier layout.
export function ReportSurface({ data, compact = true }: { data: ReportData; compact?: boolean }) {
  const range = fmtRange(data.spec.rangeFromIso, data.spec.rangeToIso)
  return (
    <CardShell icon={FileBarChart} title={data.title} subtitle={data.summary ?? range ?? undefined}>
      <div className={cn('flex flex-col', compact ? 'gap-3' : 'gap-5')}>
        {data.spec.sections.map((section, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: sections are an immutable rendered list from a frozen spec
          <SectionRenderer key={`section-${i}`} section={section} />
        ))}
        {compact ? (
          <div className="mt-1 flex items-center justify-end border-t border-border/60 pt-3">
            <Link
              href={data.url}
              className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-xs font-medium text-brand-foreground transition-[filter] hover:brightness-110"
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden />
              Open full report
            </Link>
          </div>
        ) : null}
      </div>
    </CardShell>
  )
}

function SectionRenderer({ section }: { section: Section }) {
  switch (section.type) {
    case 'text':
      return <TextSection body={section.body} />
    case 'kpi':
      return <KpiGroupSection kpis={[section.kpi]} />
    case 'kpiGroup':
      return <KpiGroupSection title={section.title} kpis={section.kpis} />
    case 'bar':
      return (
        <BarSection
          title={section.title}
          caption={section.caption}
          rows={section.rows}
          unit={section.unit}
        />
      )
    case 'table':
      return <TableSection title={section.title} columns={section.columns} rows={section.rows} />
    case 'divider':
      return <DividerSection label={section.label} />
    default:
      return null
  }
}

function TextSection({ body }: { body: string }) {
  return (
    <div className="text-[13.5px] leading-relaxed text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => (
            <ul className="mb-2 ml-5 list-disc space-y-1 last:mb-0">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="mb-2 ml-5 list-decimal space-y-1 last:mb-0">{children}</ol>
          ),
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
        }}
      >
        {body}
      </ReactMarkdown>
    </div>
  )
}

function KpiGroupSection({ title, kpis }: { title?: string; kpis: Kpi[] }) {
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
      ? 'text-emerald-700 dark:text-emerald-400'
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
  positive: 'bg-emerald-600 dark:bg-emerald-500',
  warning: 'bg-amber-500 dark:bg-amber-400',
  negative: 'bg-destructive',
}

function BarSection({
  title,
  caption,
  rows,
  unit,
}: {
  title?: string
  caption?: string
  rows: BarRow[]
  unit?: string
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
                  {r.value.toLocaleString()}
                  {unit ? <span className="ml-0.5 text-muted-foreground">{unit}</span> : null}
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

function TableSection({
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

function DividerSection({ label }: { label?: string }) {
  if (!label) return <hr className="border-border/60" />
  return (
    <div className="flex items-center gap-3">
      <hr className="flex-1 border-border/60" />
      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </span>
      <hr className="flex-1 border-border/60" />
    </div>
  )
}
