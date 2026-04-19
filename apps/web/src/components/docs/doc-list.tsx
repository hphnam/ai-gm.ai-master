'use client'

import Link from 'next/link'
import type { DocListItem } from '@gm-ai/types'

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

export function DocList({
  docs,
  isLoading,
}: {
  docs: DocListItem[] | undefined
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground italic">Loading docs…</p>
    )
  }
  if (!docs || docs.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No docs yet. Add one using the form to seed your knowledge base.
        </p>
      </div>
    )
  }
  return (
    <ul className="space-y-3">
      {docs.map((d) => (
        <li
          key={d.id}
          className="rounded-md border bg-card p-4 space-y-2 hover:border-foreground/30 transition-colors"
        >
          <header className="flex flex-wrap items-baseline gap-2">
            <h3 className="text-sm font-semibold truncate">
              <Link href={`/docs/${d.id}`} className="hover:underline underline-offset-4">
                {d.title ?? d.docType ?? 'Untitled'}
              </Link>
            </h3>
            {d.docType ? (
              <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                {d.docType}
              </span>
            ) : null}
            <span className="ml-auto text-xs text-muted-foreground">
              {formatRelative(d.updatedAt)}
            </span>
          </header>
          <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">
            {d.summary ?? d.contentPreview}
          </p>
          <footer className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {d.venueName ? (
              <span className="px-1.5 py-0.5 rounded bg-muted">{d.venueName}</span>
            ) : (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-900">
                Global
              </span>
            )}
            {d.tags.slice(0, 5).map((t) => (
              <span key={t} className="px-1.5 py-0.5 rounded bg-muted">
                #{t}
              </span>
            ))}
            {d.tags.length > 5 ? (
              <span>+{d.tags.length - 5} more</span>
            ) : null}
          </footer>
        </li>
      ))}
    </ul>
  )
}
