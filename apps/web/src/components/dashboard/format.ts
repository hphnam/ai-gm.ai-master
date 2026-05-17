/// Number / date / currency formatters shared by every dashboard card. Kept
/// in one place so the dashboard stays internally consistent (e.g. £12.30
/// everywhere, never £12.3 or 12.30 GBP).

const GBP = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 0,
})

const GBP_2DP = new Intl.NumberFormat('en-GB', {
  style: 'currency',
  currency: 'GBP',
  maximumFractionDigits: 2,
})

const USD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 2,
})

const COMPACT = new Intl.NumberFormat('en-GB', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

const PERCENT = new Intl.NumberFormat('en-GB', {
  style: 'percent',
  maximumFractionDigits: 0,
})

const SHORT_DATE = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
})

export function formatGbpFromCents(cents: number, opts?: { precise?: boolean }): string {
  return (opts?.precise ? GBP_2DP : GBP).format(cents / 100)
}

export function formatUsdFromCents(cents: number): string {
  return USD.format(cents / 100)
}

export function formatCompact(n: number): string {
  return COMPACT.format(n)
}

export function formatPercent(n: number): string {
  if (!Number.isFinite(n)) return '—'
  return PERCENT.format(n)
}

export function formatHours(h: number): string {
  if (h === 0) return '0h'
  if (h < 1) return `${Math.round(h * 60)}m`
  if (h < 10) return `${h.toFixed(1)}h`
  return `${Math.round(h)}h`
}

export function formatShortDate(iso: string): string {
  // Buckets come in as YYYY-MM-DD; parse as UTC to avoid one-day-off drift
  // when the browser sits east of UTC.
  const d = new Date(`${iso}T00:00:00Z`)
  return SHORT_DATE.format(d)
}

export function formatRelativeDays(iso: string, now: Date = new Date()): string {
  const d = new Date(iso)
  const days = Math.round((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000))
  if (days <= 0) return 'today'
  if (days === 1) return 'yesterday'
  if (days < 7) return `${days}d ago`
  if (days < 30) return `${Math.round(days / 7)}w ago`
  return `${Math.round(days / 30)}mo ago`
}
