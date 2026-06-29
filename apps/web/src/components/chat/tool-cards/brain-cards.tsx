'use client'

import { Activity, AlertTriangle, Beer, Lightbulb, TrendingUp } from 'lucide-react'
import { CardEmpty, CardShell } from './card-shell'
import { isToolFail, isToolOk, type ToolCardRendererProps } from './types'

// Cards for the Proactive Brain tools (Track B). Tools without a card still
// function — they render as a chip in the thought-process strip.

const VENUE_LABELS: Record<string, string> = {
  beer_hall: 'The Beer Hall',
  two_river_taps: 'Two River Taps',
  ellel: 'Ellel Village Hall',
}

function gbp(n: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    maximumFractionDigits: 0,
  }).format(n)
}

// ─── brain_forecast_sales ────────────────────────────────────────────────

type BandRow = { date: string; yhat: number; lo: number; hi: number; level: number }
type ForecastData = {
  venue: string
  layer: string
  level: number
  key: string | null
  forecast: BandRow[]
}

export function ForecastBandCard({ part }: ToolCardRendererProps) {
  const output = part.output
  if (isToolFail(output)) {
    return (
      <CardShell icon={TrendingUp} title="Sales forecast">
        <CardEmpty
          message={
            output.reason === 'no-data'
              ? 'No calibrated band for that venue/range yet.'
              : (output.detail ?? "Couldn't produce a forecast.")
          }
        />
      </CardShell>
    )
  }
  if (!isToolOk<ForecastData>(output)) return null
  const { venue, layer, level, key, forecast } = output.data
  if (!forecast?.length) {
    return (
      <CardShell icon={TrendingUp} title="Sales forecast">
        <CardEmpty message="No dates in that range." />
      </CardShell>
    )
  }
  const isMoney = layer === 'L1'
  const rows = forecast.slice(0, 8)
  const fmt = (n: number) => (isMoney ? gbp(n) : `${Math.round(n)}`)
  return (
    <CardShell
      icon={TrendingUp}
      title={`Forecast — ${VENUE_LABELS[venue] ?? venue}`}
      subtitle={`${key ? `${key} · ` : ''}${layer} · ${Math.round(level * 100)}% band`}
    >
      <ul className="-mx-1 divide-y divide-border/60">
        {rows.map((r) => (
          <li key={r.date} className="flex items-center justify-between gap-3 px-1 py-1.5">
            <span className="text-[12px] tabular-nums text-muted-foreground">{r.date}</span>
            <span className="text-[13px] font-medium tabular-nums text-foreground">
              {fmt(r.yhat)}
            </span>
            <span className="text-[11px] tabular-nums text-muted-foreground">
              {fmt(r.lo)} – {fmt(r.hi)}
            </span>
          </li>
        ))}
      </ul>
      {forecast.length > rows.length ? (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          +{forecast.length - rows.length} more day(s)
        </p>
      ) : null}
    </CardShell>
  )
}

// ─── brain_check_deviation ───────────────────────────────────────────────

type DeviationData = {
  found: boolean
  venue: string
  layer: string
  date?: string
  status: 'normal' | 'deviation'
  direction?: 'up' | 'down'
  severity?: 'medium' | 'high' | null
  actual?: number
  expected?: number
  band_low?: number
  band_high?: number
  z?: number
  reason?: string[]
}

const SEVERITY_CLASS: Record<string, string> = {
  high: 'bg-red-500/10 text-red-700 dark:text-red-400',
  medium: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  low: 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-500',
}

export function DeviationCard({ part }: ToolCardRendererProps) {
  const output = part.output
  if (isToolFail(output)) {
    return (
      <CardShell icon={AlertTriangle} title="Deviation check">
        <CardEmpty
          message={
            output.reason === 'no-data'
              ? (output.detail ?? 'No trading-day band to check for that venue.')
              : (output.detail ?? "Couldn't check for deviations.")
          }
        />
      </CardShell>
    )
  }
  if (!isToolOk<DeviationData>(output)) return null
  const { venue, layer, date, status, direction, severity, actual, band_low, band_high, reason } =
    output.data
  const label = VENUE_LABELS[venue] ?? venue
  // L1 is revenue (£); L2/L3 are unit counts — don't render kegs as currency.
  const fmt = (n: number) => (layer === 'L1' ? gbp(n) : `${Math.round(n)}`)
  const band =
    band_low != null && band_high != null ? `band ${fmt(band_low)}–${fmt(band_high)}` : null

  if (status === 'normal') {
    return (
      <CardShell
        icon={TrendingUp}
        title={`${label} — trading normally`}
        subtitle={date ? `${date} · inside band` : 'inside band'}
        tone="success"
      >
        <p className="text-[12.5px] text-muted-foreground">
          {actual != null ? `${fmt(actual)} ` : ''}within the calibrated band
          {band ? ` (${band})` : ''}.
        </p>
      </CardShell>
    )
  }
  return (
    <CardShell
      icon={AlertTriangle}
      title={`${label} — ${direction === 'up' ? 'above' : 'below'} band`}
      subtitle={date ?? undefined}
      tone="warning"
    >
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] tabular-nums text-foreground">
          {actual != null ? fmt(actual) : '—'} {direction === 'up' ? '↑' : '↓'}{' '}
          {band ? <span className="text-muted-foreground">({band})</span> : null}
        </span>
        {severity ? (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
              SEVERITY_CLASS[severity] ?? SEVERITY_CLASS.low
            }`}
          >
            {severity}
          </span>
        ) : null}
      </div>
      {reason?.[0] ? (
        <p className="mt-1 text-[11.5px] italic text-muted-foreground">{reason[0]}</p>
      ) : null}
    </CardShell>
  )
}

// ─── brain_find_sop_gaps ─────────────────────────────────────────────────

type Gap = {
  size: number
  failed: number
  failure_density: number
  score: number
  examples: string[]
}
type SopGapsData = {
  failure_rate: number
  embedding_backend: string
  gaps: Gap[]
}

export function SopGapsCard({ part }: ToolCardRendererProps) {
  const output = part.output
  if (isToolFail(output)) {
    return (
      <CardShell icon={Lightbulb} title="Missing SOPs">
        <CardEmpty message={output.detail ?? "Couldn't analyse the chat history."} />
      </CardShell>
    )
  }
  if (!isToolOk<SopGapsData>(output)) return null
  const { failure_rate, gaps } = output.data
  if (!gaps?.length) {
    return (
      <CardShell icon={Lightbulb} title="Missing SOPs" tone="success">
        <CardEmpty message="No knowledge gaps above baseline." />
      </CardShell>
    )
  }
  return (
    <CardShell
      icon={Lightbulb}
      title="Missing SOPs"
      subtitle={`${Math.round(failure_rate * 100)}% of questions currently go unanswered`}
      tone="warning"
    >
      <ul className="space-y-2">
        {gaps.slice(0, 4).map((g, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: ranked gaps for one result never reorder mid-render
          <li key={i} className="rounded-md bg-muted/40 px-2.5 py-1.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-foreground">
                {Math.round(g.failure_density * 100)}% fail · {g.failed} asks
              </span>
            </div>
            {g.examples?.[0] ? (
              <p className="mt-0.5 truncate text-[11.5px] italic text-muted-foreground">
                “{g.examples[0]}”
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </CardShell>
  )
}

// ─── brain_check_stock_cover ─────────────────────────────────────────────

type CoverLine = {
  product: string
  l1: string
  on_hand_kegs: number | null
  days_of_cover: number | null
  reorder: boolean | null
  suggested_order_kegs: number | null
  a6_node: string | null
}
type StockCoverData = {
  venue: string
  as_of: string | null
  n_reorder: number
  lines: CoverLine[]
}

export function StockCoverCard({ part }: ToolCardRendererProps) {
  const output = part.output
  if (isToolFail(output)) {
    return (
      <CardShell icon={Beer} title="Stock cover">
        <CardEmpty
          message={
            output.reason === 'no-data'
              ? (output.detail ?? 'No stock data for that venue.')
              : (output.detail ?? "Couldn't check stock cover.")
          }
        />
      </CardShell>
    )
  }
  if (!isToolOk<StockCoverData>(output)) return null
  const { venue, as_of, n_reorder, lines } = output.data
  // Reorder lines first, then by tightest cover; show the actionable ones.
  const ranked = [...(lines ?? [])]
    .filter((l) => l.days_of_cover != null)
    .sort(
      (a, b) =>
        Number(b.reorder ?? false) - Number(a.reorder ?? false) ||
        (a.days_of_cover ?? 0) - (b.days_of_cover ?? 0),
    )
    .slice(0, 6)
  if (!ranked.length) {
    return (
      <CardShell icon={Beer} title={`Stock cover — ${VENUE_LABELS[venue] ?? venue}`}>
        <CardEmpty message="No keg lines with a forecast to compute cover yet." />
      </CardShell>
    )
  }
  return (
    <CardShell
      icon={Beer}
      title={`Stock cover — ${VENUE_LABELS[venue] ?? venue}`}
      subtitle={`${n_reorder} line(s) to reorder${as_of ? ` · as of ${as_of}` : ''}`}
      tone={n_reorder > 0 ? 'warning' : 'success'}
    >
      <ul className="-mx-1 divide-y divide-border/60">
        {ranked.map((l) => (
          <li
            key={`${l.product}-${l.l1}-${l.a6_node ?? ''}`}
            className="flex items-center justify-between gap-2 px-1 py-1.5"
          >
            <span className="truncate text-[12.5px] capitalize text-foreground">{l.product}</span>
            <span className="shrink-0 text-[12px] tabular-nums text-muted-foreground">
              {l.days_of_cover?.toFixed(1)}d cover
            </span>
            {l.reorder ? (
              <span className="shrink-0 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10.5px] font-medium text-amber-700 dark:text-amber-400">
                order {l.suggested_order_kegs ?? 0}
              </span>
            ) : (
              <span className="shrink-0 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10.5px] font-medium text-emerald-700 dark:text-emerald-400">
                ok
              </span>
            )}
          </li>
        ))}
      </ul>
    </CardShell>
  )
}

// ─── brain_check_change_point ────────────────────────────────────────────

type ChangePoint = {
  onset_date: string
  direction: 'up' | 'down'
  magnitude_band_units: number | null
  magnitude_pct: number | null
  detector: string
  severity: 'low' | 'medium' | 'high'
  recalibration_needed: boolean | null
  attribution: string[]
}
type ChangePointData = {
  venue: string
  stable: boolean
  n_change_points: number
  change_points: ChangePoint[]
}

export function ChangePointCard({ part }: ToolCardRendererProps) {
  const output = part.output
  if (isToolFail(output)) {
    return (
      <CardShell icon={Activity} title="Regime shift">
        <CardEmpty
          message={
            output.reason === 'not-supported'
              ? (output.detail ?? 'Change-point detection not run for that venue.')
              : (output.detail ?? "Couldn't check for regime shifts.")
          }
        />
      </CardShell>
    )
  }
  if (!isToolOk<ChangePointData>(output)) return null
  const { venue, stable, change_points } = output.data
  if (stable || !change_points?.length) {
    return (
      <CardShell
        icon={TrendingUp}
        title={`${VENUE_LABELS[venue] ?? venue} — no regime shift`}
        subtitle="trading rhythm is stable"
        tone="success"
      >
        <p className="text-[12.5px] text-muted-foreground">
          No sustained change in normal detected.
        </p>
      </CardShell>
    )
  }
  const ranked = [...change_points].sort(
    (a, b) =>
      Number(b.severity === 'high') - Number(a.severity === 'high') ||
      b.onset_date.localeCompare(a.onset_date),
  )
  return (
    <CardShell
      icon={Activity}
      title={`${VENUE_LABELS[venue] ?? venue} — ${change_points.length} regime shift${change_points.length === 1 ? '' : 's'}`}
      subtitle="sustained change in normal"
      tone="warning"
    >
      <ul className="space-y-2">
        {ranked.slice(0, 4).map((cp) => (
          <li
            key={`${cp.onset_date}-${cp.direction}`}
            className="rounded-md bg-muted/40 px-2.5 py-1.5"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-[12.5px] font-medium text-foreground">
                since {cp.onset_date} · {cp.direction === 'down' ? '↓' : '↑'}
                {cp.magnitude_pct != null ? ` ${Math.abs(Math.round(cp.magnitude_pct))}%` : ''}
              </span>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-medium ${
                  SEVERITY_CLASS[cp.severity] ?? SEVERITY_CLASS.low
                }`}
              >
                {cp.severity}
              </span>
            </div>
            {cp.attribution?.[0] ? (
              <p className="mt-0.5 text-[11.5px] italic text-muted-foreground">
                {cp.attribution[0]}
              </p>
            ) : null}
            {cp.recalibration_needed ? (
              <p className="mt-0.5 text-[11px] text-amber-700 dark:text-amber-400">
                forecast baseline likely stale — re-learn the rhythm
              </p>
            ) : null}
          </li>
        ))}
      </ul>
    </CardShell>
  )
}
