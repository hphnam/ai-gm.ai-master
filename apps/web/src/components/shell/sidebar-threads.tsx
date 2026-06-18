'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import { MessagesSquare, Store, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { useConversationsList, useDeleteConversation } from '@/lib/hooks/use-conversations-list'
import { cn } from '@/lib/utils'

function formatRelative(iso: string): string {
  const then = new Date(iso).getTime()
  const diffMs = Date.now() - then
  const min = Math.floor(diffMs / 60_000)
  if (min < 1) return 'just now'
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d`
  return new Date(iso).toLocaleDateString()
}

// Each thread row is ~52px tall (two-line layout + 6px vertical padding).
// react-virtual uses this as the initial estimate; rows are re-measured on
// mount, so a precise constant isn't needed.
const ROW_ESTIMATE_PX = 52

export function SidebarThreads() {
  const router = useRouter()
  const params = useSearchParams()
  const currentConv = params.get('conv')
  const { items, isLoading, hasNextPage, isFetchingNextPage, fetchNextPage } =
    useConversationsList(null)
  const deleteConversation = useDeleteConversation()

  const scrollRef = useRef<HTMLDivElement>(null)
  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_ESTIMATE_PX,
    overscan: 6,
    getItemKey: (i) => items[i]?.id ?? i,
  })

  // Page-ahead: when the last virtualized row is within view, request the
  // next page. We depend on the last index (a primitive) rather than the
  // whole `virtualItems` array (which is a fresh reference every render) so
  // the effect doesn't fire on every scroll tick — only when the bottom of
  // the rendered window actually advances.
  const virtualItems = virtualizer.getVirtualItems()
  const lastVisibleIndex = virtualItems[virtualItems.length - 1]?.index ?? -1
  useEffect(() => {
    if (lastVisibleIndex >= items.length - 1 && hasNextPage && !isFetchingNextPage) {
      fetchNextPage()
    }
  }, [lastVisibleIndex, items.length, hasNextPage, isFetchingNextPage, fetchNextPage])

  const handleDelete = async (convId: string, venueId: string) => {
    if (!window.confirm('Delete this thread? This cannot be undone.')) return
    try {
      await deleteConversation.mutateAsync({ conversationId: convId, venueId })
      toast.success('Thread deleted')
      if (convId === currentConv) {
        router.replace(`/chat?venue=${venueId}`)
      }
    } catch {
      toast.error('Could not delete thread')
    }
  }

  if (isLoading) {
    return <p className="px-2 text-xs text-sidebar-muted">Loading threads…</p>
  }
  if (items.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-md px-2 py-2 text-xs text-sidebar-muted">
        <MessagesSquare className="h-3.5 w-3.5" aria-hidden />
        No threads yet.
      </div>
    )
  }

  return (
    <div ref={scrollRef} className="scrollbar-thin h-full overflow-y-auto pr-1">
      <ol
        className="relative"
        style={{ height: virtualizer.getTotalSize() }}
        aria-label="Recent conversations"
      >
        {virtualItems.map((vi) => {
          const c = items[vi.index]
          if (!c) return null
          const isActive = c.id === currentConv
          return (
            <li
              key={c.id}
              ref={virtualizer.measureElement}
              data-index={vi.index}
              className="group/thread absolute inset-x-0"
              style={{ transform: `translateY(${vi.start}px)` }}
            >
              <div
                className={cn(
                  'mx-0 mb-0.5 flex items-start gap-1.5 rounded-md px-2 py-1.5 text-left transition-colors',
                  isActive ? 'bg-sidebar-accent' : 'hover:bg-sidebar-accent/60',
                )}
              >
                <button
                  type="button"
                  onClick={() => router.push(`/chat?venue=${c.venueId}&conv=${c.id}`)}
                  className="flex min-w-0 flex-1 cursor-pointer flex-col items-start gap-0.5 text-left"
                >
                  <span
                    className={cn(
                      'line-clamp-1 text-[13px]',
                      isActive
                        ? 'font-semibold text-sidebar-foreground'
                        : 'text-sidebar-foreground/90',
                    )}
                  >
                    {c.preview ?? '(empty thread)'}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] text-sidebar-muted">
                    <Store className="h-3 w-3" aria-hidden />
                    <span className="truncate">{c.venueName}</span>
                    <span>·</span>
                    <span>{formatRelative(c.lastMessageAt)}</span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-label="Delete thread"
                  onClick={(e) => {
                    e.stopPropagation()
                    handleDelete(c.id, c.venueId)
                  }}
                  disabled={deleteConversation.isPending}
                  className={cn(
                    'mt-0.5 rounded p-1 text-sidebar-muted opacity-0 transition',
                    'hover:bg-destructive/10 hover:text-destructive',
                    'focus-visible:opacity-100 group-hover/thread:opacity-100',
                    'disabled:opacity-50',
                  )}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </li>
          )
        })}
      </ol>
      {isFetchingNextPage ? (
        <p className="px-2 py-1.5 text-[11px] text-sidebar-muted">Loading more…</p>
      ) : !hasNextPage && items.length > 0 ? (
        <Link
          href="/chat/history"
          className="block px-2 py-1.5 text-[11px] text-sidebar-muted hover:text-sidebar-foreground"
        >
          View all in history →
        </Link>
      ) : null}
    </div>
  )
}
