'use client'

import { AlertCircle, CheckCircle2, CircleDashed, Hourglass, Loader2, XCircle } from 'lucide-react'
import type { DebugRetagQueueResponseDto as DebugRetagQueueResponse } from '@/generated/api'
import type { DebugRetagQueueItemDto as DebugRetagQueueItem } from '@/lib/api-types'
import { mapApiError } from '@/lib/map-api-error'
import { cn } from '@/lib/utils'

type Props = {
  data: DebugRetagQueueResponse | undefined
  isLoading: boolean
  error: unknown
  onItemClick?: (sourceMessageId: string) => void
}

function relativeTime(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return `${diffSec}s ago`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  return `${Math.floor(diffHr / 24)}d ago`
}

const STATUS_STYLE: Record<string, { icon: typeof CheckCircle2; cls: string; label: string }> = {
  queued: { icon: Hourglass, cls: 'bg-sky-500/20 text-sky-900 border-sky-500/40', label: 'queued' },
  processing: {
    icon: Loader2,
    cls: 'bg-indigo-500/20 text-indigo-900 border-indigo-500/40',
    label: 'processing',
  },
  done: {
    icon: CheckCircle2,
    cls: 'bg-emerald-500/20 text-emerald-900 border-emerald-500/40',
    label: 'done',
  },
  failed: {
    icon: XCircle,
    cls: 'bg-red-500/20 text-red-900 border-red-500/40',
    label: 'failed',
  },
  exhausted: {
    icon: AlertCircle,
    cls: 'bg-amber-500/20 text-amber-900 border-amber-500/40',
    label: 'exhausted',
  },
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLE[status] ?? {
    icon: CircleDashed,
    cls: 'bg-muted text-foreground border-border',
    label: status,
  }
  const Icon = style.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2 py-0.5 rounded border text-[10px] uppercase font-mono',
        style.cls,
      )}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {style.label}
    </span>
  )
}

function CountsStrip({ counts }: { counts: DebugRetagQueueResponse['counts'] }) {
  const entries: Array<[keyof typeof counts, number]> = [
    ['queued', counts.queued],
    ['processing', counts.processing],
    ['done', counts.done],
    ['failed', counts.failed],
    ['exhausted', counts.exhausted],
  ]
  return (
    <section className="flex flex-wrap gap-2" aria-label="Queue status counts">
      {entries.map(([k, n]) => {
        const style = STATUS_STYLE[k]
        const Icon = style.icon
        return (
          <span
            key={k}
            className={cn(
              'inline-flex items-center gap-1 px-2 py-1 rounded border text-xs',
              style.cls,
            )}
          >
            <Icon className="h-3 w-3" aria-hidden="true" />
            <span className="uppercase font-mono">{k}</span>
            <span className="font-semibold">{n}</span>
          </span>
        )
      })}
    </section>
  )
}

function QueueItem({
  item,
  onItemClick,
}: {
  item: DebugRetagQueueItem
  onItemClick?: (sourceMessageId: string) => void
}) {
  return (
    <div className="border border-border rounded p-3 bg-card space-y-2">
      <div className="flex items-center gap-2">
        <StatusBadge status={item.status} />
        <span className="text-[10px] text-muted-foreground font-mono">
          attempts {item.attempts}
        </span>
        <span className="ml-auto text-[10px] text-muted-foreground">
          {relativeTime(item.createdAt)}
        </span>
      </div>

      <div className="text-xs font-medium">{item.reason}</div>

      <div className="whitespace-pre-wrap break-words text-xs text-muted-foreground">
        {item.knowledgeItem.contentPreview}
      </div>

      {item.lastError ? (
        <div className="text-[11px] text-red-700 line-clamp-2 break-words">{item.lastError}</div>
      ) : null}

      {item.sourceMessageId ? (
        onItemClick ? (
          <button
            type="button"
            onClick={() => onItemClick(item.sourceMessageId!)}
            className="text-[10px] font-mono text-muted-foreground hover:text-foreground underline"
          >
            source msg {item.sourceMessageId.slice(0, 8)}…
          </button>
        ) : (
          <div className="text-[10px] font-mono text-muted-foreground">
            source msg {item.sourceMessageId.slice(0, 8)}…
          </div>
        )
      ) : null}
    </div>
  )
}

function SkeletonItem() {
  return <div className="h-20 animate-pulse bg-muted rounded" />
}

export function DebugRetagQueue({ data, isLoading, error, onItemClick }: Props) {
  if (isLoading) {
    return (
      <div className="space-y-2">
        <SkeletonItem />
        <SkeletonItem />
        <SkeletonItem />
      </div>
    )
  }

  if (error) {
    return (
      <div
        role="alert"
        className="border border-destructive/40 bg-destructive/10 text-sm rounded-md p-4"
      >
        Failed to load re-tag queue. {mapApiError(error)}
      </div>
    )
  }

  if (!data) return null

  return (
    <section aria-label="Re-tag Queue" className="space-y-3">
      <CountsStrip counts={data.counts} />
      {data.items.length === 0 ? (
        <div className="text-xs text-muted-foreground italic">Queue is empty.</div>
      ) : (
        <div className="space-y-2">
          {data.items.map((item) => (
            <QueueItem key={item.id} item={item} onItemClick={onItemClick} />
          ))}
        </div>
      )}
    </section>
  )
}
