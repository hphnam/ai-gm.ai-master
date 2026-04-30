'use client'

import { FileText, MapPin, Tag } from 'lucide-react'
import { useDoc } from '@/lib/hooks/use-docs'

const PREVIEW_CHAR_LIMIT = 1500

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

export function DocPreview({ docId }: { docId: string }) {
  const { data, isLoading, isError } = useDoc(docId)

  if (isLoading) {
    return (
      <div className="space-y-3" aria-busy="true" aria-label="Loading document preview">
        <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        <div className="h-5 w-3/4 animate-pulse rounded bg-muted" />
        <div className="space-y-2">
          <div className="h-3 w-full animate-pulse rounded bg-muted" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
          <div className="h-3 w-4/6 animate-pulse rounded bg-muted" />
        </div>
      </div>
    )
  }

  if (isError || !data) {
    return (
      <p className="text-sm italic text-muted-foreground">
        Couldn’t load preview.
      </p>
    )
  }

  const title = data.title?.trim() || 'Untitled document'
  const content = data.content?.trim() ?? ''
  const truncated = content.length > PREVIEW_CHAR_LIMIT
  const excerpt = truncated
    ? `${content.slice(0, PREVIEW_CHAR_LIMIT)}…`
    : content

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Document preview
        </p>
        <p className="text-sm font-semibold leading-snug break-words sm:text-base">
          {title}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin className="h-3 w-3" aria-hidden />
          {data.venueName ?? 'All venues'}
        </span>
        <span>Uploaded {formatRelative(data.createdAt)}</span>
        {data.tags.slice(0, 4).map((t) => (
          <span key={t} className="inline-flex items-center gap-1">
            <Tag className="h-3 w-3" aria-hidden />
            {t}
          </span>
        ))}
        {data.tags.length > 4 ? (
          <span className="text-muted-foreground/70">
            +{data.tags.length - 4} more
          </span>
        ) : null}
      </div>

      {data.summary ? (
        <p className="rounded-md bg-muted/50 p-3 text-xs leading-relaxed text-muted-foreground">
          {data.summary}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-md border bg-background">
        <div className="flex items-center gap-1.5 border-b bg-muted/30 px-3 py-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          <FileText className="h-3 w-3" aria-hidden />
          Content
        </div>
        <div className="scrollbar-thin max-h-[40vh] min-h-[140px] overflow-auto">
          {excerpt ? (
            <pre className="whitespace-pre-wrap break-words p-3 font-sans text-xs leading-relaxed text-foreground">
              {excerpt}
            </pre>
          ) : (
            <p className="p-3 text-xs italic text-muted-foreground">
              No readable content was extracted from this file.
            </p>
          )}
        </div>
        {truncated ? (
          <div className="border-t bg-muted/20 px-3 py-1.5 text-[11px] text-muted-foreground">
            Showing first {PREVIEW_CHAR_LIMIT.toLocaleString()} characters of{' '}
            {content.length.toLocaleString()}.
          </div>
        ) : null}
      </div>
    </div>
  )
}
