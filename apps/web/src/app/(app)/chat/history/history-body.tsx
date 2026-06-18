'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import { MessagesSquare, Search, Store, Trash2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useRef, useState } from 'react'
import { toast } from 'sonner'
import { AppShell } from '@/components/shell/app-shell'
import { useDebouncedValue } from '@/components/shell/notifications-shared'
import { PageHeader } from '@/components/shell/page-header'
import { EmptyState } from '@/components/ui/empty-state'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import {
  type ConvListItem,
  useConversationsList,
  useDeleteConversation,
} from '@/lib/hooks/use-conversations-list'
import { cn } from '@/lib/utils'

type Row =
  | { kind: 'header'; key: string; label: string; count: number }
  | { kind: 'item'; key: string; item: ConvListItem }

// Row size estimates fed to react-virtual. Real heights override these on
// measurement, but a sensible initial value reduces layout jank on first
// paint and on cold pagination.
const HEADER_SIZE_PX = 40
const ITEM_SIZE_PX = 68

const SECTIONS: Array<{ key: string; label: string; maxAgeDays: number | null }> = [
  { key: 'today', label: 'Today', maxAgeDays: 0 },
  { key: 'yesterday', label: 'Yesterday', maxAgeDays: 1 },
  { key: 'last7', label: 'Last 7 days', maxAgeDays: 7 },
  { key: 'last30', label: 'Last 30 days', maxAgeDays: 30 },
  { key: 'older', label: 'Older', maxAgeDays: null },
]

function sectionForDate(iso: string, now: Date): string {
  const then = new Date(iso)
  const sameDay =
    then.getFullYear() === now.getFullYear() &&
    then.getMonth() === now.getMonth() &&
    then.getDate() === now.getDate()
  if (sameDay) return 'today'
  const dayMs = 24 * 60 * 60 * 1000
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const diffDays = Math.floor((startOfToday - then.getTime()) / dayMs)
  if (diffDays < 1) return 'yesterday'
  if (diffDays < 7) return 'last7'
  if (diffDays < 30) return 'last30'
  return 'older'
}

function buildRows(items: ConvListItem[]): Row[] {
  const now = new Date()
  const buckets = new Map<string, ConvListItem[]>()
  for (const it of items) {
    const k = sectionForDate(it.lastMessageAt, now)
    const arr = buckets.get(k) ?? []
    arr.push(it)
    buckets.set(k, arr)
  }
  const rows: Row[] = []
  for (const s of SECTIONS) {
    const list = buckets.get(s.key)
    if (!list || list.length === 0) continue
    rows.push({ kind: 'header', key: `h-${s.key}`, label: s.label, count: list.length })
    for (const item of list) {
      rows.push({ kind: 'item', key: item.id, item })
    }
  }
  return rows
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function HistoryBody() {
  const router = useRouter()
  const [rawQuery, setRawQuery] = useState('')
  const debouncedQuery = useDebouncedValue(rawQuery, 200)
  const { items, isLoading, isFetching, isFetchingNextPage, hasNextPage, fetchNextPage, error } =
    useConversationsList(null, { q: debouncedQuery, limit: 50 })
  const deleteConversation = useDeleteConversation()

  const rows = useMemo(() => buildRows(items), [items])

  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (i) => (rows[i]?.kind === 'header' ? HEADER_SIZE_PX : ITEM_SIZE_PX),
    overscan: 8,
    getItemKey: (i) => rows[i]?.key ?? i,
  })

  const virtualItems = virtualizer.getVirtualItems()
  const lastVisibleIndex = virtualItems[virtualItems.length - 1]?.index ?? -1
  useEffect(() => {
    if (lastVisibleIndex >= rows.length - 1 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [lastVisibleIndex, rows.length, hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleDelete = async (e: React.MouseEvent, convId: string, venueId: string) => {
    e.stopPropagation()
    if (!window.confirm('Delete this thread? This cannot be undone.')) return
    try {
      await deleteConversation.mutateAsync({ conversationId: convId, venueId })
      toast.success('Thread deleted')
    } catch {
      toast.error('Could not delete thread')
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Chat history"
        description="Search and reopen any thread you've started across your venues."
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        <div className="border-b border-border bg-background/80 px-4 py-3 backdrop-blur sm:px-6">
          <div className="relative mx-auto max-w-3xl">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              placeholder="Search threads by message or venue…"
              aria-label="Search chat history"
              value={rawQuery}
              onChange={(e) => setRawQuery(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-3xl px-4 py-4 sm:px-6">
            {isLoading ? (
              <HistorySkeleton />
            ) : error ? (
              <EmptyState
                icon={MessagesSquare}
                title="Couldn't load history"
                description="Refresh the page or try again in a moment."
              />
            ) : rows.length === 0 ? (
              <EmptyState
                icon={MessagesSquare}
                title={debouncedQuery ? 'No threads match' : 'No threads yet'}
                description={
                  debouncedQuery
                    ? 'Try a different search term, or clear the search to see all threads.'
                    : 'Start a chat from the sidebar to see it here.'
                }
              />
            ) : (
              <ol
                aria-label="Chat threads"
                className="relative list-none"
                style={{ height: virtualizer.getTotalSize() }}
              >
                {virtualItems.map((vi) => {
                  const row = rows[vi.index]
                  if (!row) return null
                  return (
                    <li
                      key={row.key}
                      ref={virtualizer.measureElement}
                      data-index={vi.index}
                      className="absolute inset-x-0"
                      style={{ transform: `translateY(${vi.start}px)` }}
                    >
                      {row.kind === 'header' ? (
                        <SectionHeader label={row.label} count={row.count} />
                      ) : (
                        <HistoryRow
                          item={row.item}
                          onOpen={() =>
                            router.push(`/chat?venue=${row.item.venueId}&conv=${row.item.id}`)
                          }
                          onDelete={(e) => handleDelete(e, row.item.id, row.item.venueId)}
                          deleting={deleteConversation.isPending}
                        />
                      )}
                    </li>
                  )
                })}
              </ol>
            )}
            {isFetchingNextPage ? (
              <p className="px-1 py-3 text-xs text-muted-foreground">Loading more…</p>
            ) : !hasNextPage && rows.length > 0 ? (
              <p className="px-1 py-3 text-xs text-muted-foreground">End of history.</p>
            ) : null}
            {isFetching && !isLoading && !isFetchingNextPage && debouncedQuery ? (
              <p className="sr-only" aria-live="polite">
                Searching…
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  return (
    <div className="flex items-baseline gap-2 px-1 pt-4 pb-2">
      <h2 className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </h2>
      <span className="text-[11px] text-muted-foreground/70">{count}</span>
    </div>
  )
}

function HistoryRow({
  item,
  onOpen,
  onDelete,
  deleting,
}: {
  item: ConvListItem
  onOpen: () => void
  onDelete: (e: React.MouseEvent) => void
  deleting: boolean
}) {
  return (
    <div className="group/row flex items-start gap-2 rounded-md px-2 py-2 hover:bg-accent/50">
      <button
        type="button"
        onClick={onOpen}
        className="flex min-w-0 flex-1 cursor-pointer flex-col items-start gap-0.5 text-left"
      >
        <span className="line-clamp-1 text-sm text-foreground">
          {item.preview ?? '(empty thread)'}
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <Store className="h-3 w-3" aria-hidden />
          <span className="truncate">{item.venueName}</span>
          <span>·</span>
          <span>{formatTimestamp(item.lastMessageAt)}</span>
        </span>
      </button>
      <button
        type="button"
        aria-label="Delete thread"
        onClick={onDelete}
        disabled={deleting}
        className={cn(
          'mt-0.5 rounded p-1 text-muted-foreground opacity-0 transition',
          'hover:bg-destructive/10 hover:text-destructive',
          'focus-visible:opacity-100 group-hover/row:opacity-100',
          'disabled:opacity-50',
        )}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

function HistorySkeleton() {
  return (
    <div className="flex flex-col gap-2 py-2">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <Skeleton key={i} className="h-14 w-full" />
      ))}
    </div>
  )
}
