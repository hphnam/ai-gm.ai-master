'use client'

import { Loader2, Plus, Search, X } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  type NoDataQuery,
  useDismissNoDataQuery,
  usePromoteNoDataQuery,
} from '@/lib/hooks/use-docs'
import { mapApiError } from '@/lib/map-api-error'
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

function NoDataRow({ query }: { query: NoDataQuery }) {
  const promote = usePromoteNoDataQuery()
  const dismiss = useDismissNoDataQuery()
  const busy = promote.isPending || dismiss.isPending

  async function handlePromote() {
    try {
      const res = await promote.mutateAsync(query.query)
      toast.success(
        res.dedupedFromExisting
          ? 'Merged with an existing question above'
          : 'Added to questions — answer it from this tab',
      )
    } catch (err) {
      toast.error(mapApiError(err))
    }
  }

  async function handleDismiss() {
    try {
      await dismiss.mutateAsync(query.query)
    } catch (err) {
      toast.error(mapApiError(err))
    }
  }

  const hot = query.askCount > 1

  return (
    <li
      className={cn(
        'group grid grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1 px-3 py-2.5 sm:px-4',
        'sm:grid-cols-[auto_1fr_auto_auto] sm:gap-x-4',
        busy && 'opacity-60',
      )}
    >
      <Search className="h-3.5 w-3.5 text-muted-foreground/60" aria-hidden />

      <div className="min-w-0">
        <p className="break-words text-sm leading-snug text-foreground">{query.query}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-muted-foreground">
          <span
            className={cn('tabular-nums', hot && 'font-medium text-amber-700 dark:text-amber-400')}
          >
            asked {query.askCount}×
          </span>
          <span aria-hidden className="text-muted-foreground/40">
            ·
          </span>
          <span>{formatRelative(query.lastAskedAt)}</span>
        </div>
      </div>

      <div
        className={cn(
          'col-start-2 row-start-2 flex items-center gap-1',
          'sm:col-start-3 sm:row-start-1 sm:opacity-60 sm:transition-opacity sm:group-hover:opacity-100 sm:focus-within:opacity-100 motion-reduce:sm:transition-none',
        )}
      >
        <Button
          size="sm"
          variant="ghost"
          className="h-7 cursor-pointer gap-1 px-2 text-xs"
          onClick={handlePromote}
          disabled={busy}
          aria-label={`Add "${query.query}" to questions`}
        >
          {promote.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          ) : (
            <Plus className="h-3 w-3" aria-hidden />
          )}
          Add to questions
        </Button>
        <Button
          size="sm"
          variant="ghost"
          className="h-7 w-7 cursor-pointer p-0 text-muted-foreground hover:text-foreground"
          onClick={handleDismiss}
          disabled={busy}
          aria-label={`Dismiss "${query.query}"`}
          title="Dismiss — hide from this list"
        >
          {dismiss.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          ) : (
            <X className="h-3 w-3" aria-hidden />
          )}
        </Button>
      </div>
    </li>
  )
}

export function NoDataQueriesPanel({ queries }: { queries: NoDataQuery[] }) {
  if (queries.length === 0) return null
  return (
    <ul aria-label="Searches with no results" className="divide-y rounded-lg border bg-card/40">
      {queries.map((q) => (
        <NoDataRow key={`${q.query}|${q.lastAskedAt}`} query={q} />
      ))}
    </ul>
  )
}
