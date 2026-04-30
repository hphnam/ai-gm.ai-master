'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Search } from 'lucide-react'
import type { NoDataQuery } from '@/lib/hooks/use-docs'
import { cn } from '@/lib/utils'

function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime()
  const diffMs = Date.now() - ts
  const mins = Math.round(diffMs / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

export function NoDataQueriesPanel({ queries }: { queries: NoDataQuery[] }) {
  const [open, setOpen] = useState(false)
  if (queries.length === 0) return null
  const total = queries.reduce((s, q) => s + q.askCount, 0)
  return (
    <section
      aria-label="What staff couldn't find"
      className="rounded-lg border bg-card shadow-sm"
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40"
      >
        <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-semibold">What staff couldn&apos;t find</h2>
          <p className="text-xs text-muted-foreground truncate">
            {queries.length} unique question{queries.length === 1 ? '' : 's'}
            {' · '}
            {total} ask{total === 1 ? '' : 's'} in the last 30 days
          </p>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </button>
      {open ? (
        <ul className="divide-y border-t">
          {queries.map((q) => (
            <li key={q.query} className="flex items-center gap-3 px-4 py-2.5">
              <span
                className={cn(
                  'inline-flex h-5 min-w-[28px] items-center justify-center rounded-full px-1.5 text-[10px] font-semibold tabular-nums',
                  q.askCount > 1
                    ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
                    : 'bg-muted text-muted-foreground',
                )}
              >
                {q.askCount}×
              </span>
              <span className="flex-1 truncate text-sm">{q.query}</span>
              <span className="shrink-0 text-[11px] text-muted-foreground">
                {formatRelative(q.lastAskedAt)}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
