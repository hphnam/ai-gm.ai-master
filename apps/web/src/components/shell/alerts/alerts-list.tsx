'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import { Inbox, Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import {
  type NotificationListFilters,
  useInfiniteNotifications,
  useMarkNotificationRead,
} from '@/lib/hooks/use-notifications'
import { apiErrorLabel, ListSkeleton } from '../notifications-shared'
import { AlertRow } from './alert-row'

// Collapsed rows run ~96px (icon + up-to-3-line clamp). Expanded rows are far
// taller; measureElement + the ResizeObserver it attaches re-measure on the
// expandedId toggle, so the estimate only seeds the first paint.
const ALERT_ROW_ESTIMATE_PX = 96

export function AlertsList({
  filters,
  focusId,
}: {
  filters: NotificationListFilters
  focusId: string | null
}) {
  const query = useInfiniteNotifications(filters)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  // Reply drafts are hoisted here (keyed by note id) so an in-progress reply
  // survives the row being unmounted when it scrolls out of the virtual window.
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({})
  const markRead = useMarkNotificationRead()

  const pages = query.data?.pages ?? []
  const items = pages.flatMap((p) => p.notifications)

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ALERT_ROW_ESTIMATE_PX,
    overscan: 6,
    getItemKey: (i) => items[i]?.id ?? i,
  })
  const virtualItems = virtualizer.getVirtualItems()

  // Page-ahead: when the last virtualized row enters the rendered window,
  // request the next page. We depend on the last index (a primitive) rather
  // than the whole virtualItems array so the effect doesn't fire every tick.
  const lastRenderedIndex = virtualItems[virtualItems.length - 1]?.index ?? -1
  useEffect(() => {
    if (lastRenderedIndex >= items.length - 1 && query.hasNextPage && !query.isFetchingNextPage) {
      query.fetchNextPage()
    }
  }, [
    lastRenderedIndex,
    items.length,
    query.hasNextPage,
    query.isFetchingNextPage,
    query.fetchNextPage,
  ])

  // Scroll a deep-linked alert into view once it's in the list. The row may sit
  // outside the rendered window, so we drive the virtualizer by index rather
  // than relying on a DOM ref. The latch keeps later page loads (which change
  // items.length) from yanking the viewport back after the first scroll.
  const focusedDoneRef = useRef<string | null>(null)
  useEffect(() => {
    if (!focusId) {
      focusedDoneRef.current = null
      return
    }
    if (focusedDoneRef.current === focusId) return
    const idx = items.findIndex((n) => n.id === focusId)
    if (idx >= 0) {
      virtualizer.scrollToIndex(idx, { align: 'auto' })
      focusedDoneRef.current = focusId
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId, items.length])

  if (query.isLoading) {
    return (
      <div className="flex-1 overflow-y-auto">
        <ListSkeleton />
      </div>
    )
  }

  if (query.isError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-12 text-center">
        <Inbox className="h-6 w-6 text-[var(--ink-faint)]" aria-hidden />
        <p className="text-[var(--ink-muted)] text-sm">Couldn't load alerts.</p>
        <button
          type="button"
          onClick={() => query.refetch()}
          className="cursor-pointer text-[var(--brass)] text-xs underline-offset-4 hover:underline"
        >
          Try again
        </button>
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-2 px-4 py-16 text-center">
        <span className="flex h-11 w-11 items-center justify-center rounded-[11px] bg-[var(--paper-2)] text-[var(--ink-faint)]">
          <Inbox className="h-5 w-5" aria-hidden />
        </span>
        <p className="font-medium text-foreground text-sm">No alerts.</p>
        <p className="max-w-[260px] text-[var(--mono-muted)] text-xs">
          Reports, compliance reminders and tasks will show up here.
        </p>
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="scrollbar-thin flex-1 overflow-y-auto pt-3.5">
      <ul className="relative" style={{ height: virtualizer.getTotalSize() }}>
        {virtualItems.map((vi) => {
          const n = items[vi.index]
          if (!n) return null
          return (
            <li
              key={n.id}
              ref={virtualizer.measureElement}
              data-index={vi.index}
              className="absolute inset-x-0 px-4 pb-2"
              style={{ transform: `translateY(${vi.start}px)` }}
            >
              <AlertRow
                note={n}
                expanded={expandedId === n.id}
                isFocused={focusId === n.id}
                replyDraft={replyDrafts[n.id] ?? ''}
                onReplyDraftChange={(v) => setReplyDrafts((d) => ({ ...d, [n.id]: v }))}
                onToggle={() => {
                  const next = expandedId === n.id ? null : n.id
                  setExpandedId(next)
                  if (next && n.status === 'unread') {
                    markRead.mutate(n.id, {
                      onError: (err) => toast.error(`Couldn't mark read: ${apiErrorLabel(err)}`),
                    })
                  }
                }}
              />
            </li>
          )
        })}
      </ul>
      {query.isFetchingNextPage ? (
        <div className="flex items-center justify-center py-4 text-foreground/50 text-xs">
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
          <span className="ml-2">Loading more…</span>
        </div>
      ) : null}
    </div>
  )
}
