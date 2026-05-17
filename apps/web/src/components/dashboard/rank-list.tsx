import Link from 'next/link'
import type { ReactNode } from 'react'
import { Skeleton } from '@/components/ui/skeleton'

export type RankItem = {
  /// Stable React key. Must be unique within the list.
  key: string
  /// Numeric weight that drives the bar fill. Largest item = 100% width.
  weight: number
  /// Main label, line-clamped to one line.
  primary: ReactNode
  /// Optional second-line context (e.g. staff name, role, kind badge).
  secondary?: ReactNode
  /// Right-aligned trailing text, e.g. "12 · 2d ago". Rendered tabular-nums.
  trailing: ReactNode
  /// Optional click target. When only `onClick` is set, the row renders as
  /// a button. When `href` is set, the row renders as a Next Link (so
  /// middle-click / cmd-click open in a new tab) — `onClick` is still
  /// attached, so callers can wire analytics tagging alongside navigation.
  onClick?: () => void
  href?: string
}

type Tone = 'positive' | 'warning' | 'neutral'

type Props = {
  items: RankItem[]
  /// Which chart color drives the bar fill.
  tone?: Tone
  /// Skeleton row count to show while data is loading.
  loadingRows?: number
  isLoading?: boolean
  /// Shown when items.length === 0 and !isLoading. Plain text — wrap in your
  /// own EmptyChart if you want the centred layout.
  emptyLabel?: string
  /// Cap visible height before scrolling. The card stops dictating the row's
  /// height in a bento grid past this point.
  maxHeight?: string
  /// Hide the magnitude bar. Use when `weight` carries ordering, not count —
  /// e.g. a recency-sorted "recent escalations" list, where a bar would
  /// imply a quantitative ranking that doesn't exist.
  showBar?: boolean
}

const TONE_BG: Record<Tone, string> = {
  positive: 'bg-chart-1/15',
  warning: 'bg-chart-2/15',
  neutral: 'bg-muted',
}

/// Generic ranked-bar list. The "Top no-data queries" pattern, extracted —
/// every row has a primary label, an optional secondary line, a trailing
/// count, and a horizontal fill scaled to the row's weight versus the max.
/// Items must arrive pre-sorted; the list does not re-order.
export function RankList({
  items,
  tone = 'warning',
  loadingRows = 5,
  isLoading = false,
  emptyLabel = 'Nothing here yet.',
  maxHeight = '220px',
  showBar = true,
}: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: loadingRows }, (_, i) => (
          // biome-ignore lint/suspicious/noArrayIndexKey: skeleton placeholders are positional
          <Skeleton key={`rank-skel-${i}`} className="h-11 w-full" />
        ))}
      </div>
    )
  }
  if (items.length === 0) {
    return (
      <div className="flex items-center justify-center py-10 text-center">
        <p className="max-w-[28ch] text-sm text-muted-foreground">{emptyLabel}</p>
      </div>
    )
  }
  const max = items.reduce((m, it) => Math.max(m, it.weight), 1)
  return (
    <ol className="scrollbar-thin space-y-1.5 overflow-y-auto pr-1" style={{ maxHeight }}>
      {items.map((it) => {
        const fill = showBar ? `${Math.max(6, (it.weight / max) * 100)}%` : '0%'
        const inner = (
          <>
            {showBar ? (
              <div
                aria-hidden="true"
                className={`absolute inset-y-0 left-0 ${TONE_BG[tone]} transition-[width]`}
                style={{ width: fill }}
              />
            ) : null}
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex min-w-0 flex-col">
                <span className="line-clamp-1 text-sm text-foreground">{it.primary}</span>
                {it.secondary ? (
                  <span className="line-clamp-1 text-xs text-muted-foreground">{it.secondary}</span>
                ) : null}
              </div>
              <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                {it.trailing}
              </span>
            </div>
          </>
        )
        const interactiveClass =
          'group relative block w-full cursor-pointer overflow-hidden rounded-md border border-border bg-background px-3 py-2 text-left transition-colors hover:border-foreground/30'
        const staticClass =
          'group relative overflow-hidden rounded-md border border-border bg-background px-3 py-2'
        return (
          <li key={it.key}>
            {it.href ? (
              <Link href={it.href} onClick={it.onClick} className={interactiveClass}>
                {inner}
              </Link>
            ) : it.onClick ? (
              <button type="button" onClick={it.onClick} className={interactiveClass}>
                {inner}
              </button>
            ) : (
              <div className={staticClass}>{inner}</div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
