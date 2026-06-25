'use client'

import type { QueryClient as RqClient } from '@tanstack/react-query'
import { useCallback } from 'react'
import type { VenueListItemDto as VenueListItem } from '@/generated/api'
import type { ConvListItem } from '@/lib/hooks/use-conversations-list'

// The conversations list lives in an infinite-query cache keyed by
// ['chat-conversations', venueKey, { q, limit }] — there can be several
// active entries (sidebar default, history page search, etc.). Both
// optimistic helpers mutate every matching entry so the new/updated thread
// appears immediately regardless of which surface is mounted.
type ConvListInfinite = {
  pages: Array<{ items: ConvListItem[]; nextCursor: string | null }>
  pageParams: unknown[]
}

function listContains(data: ConvListInfinite | undefined, id: string): boolean {
  return data?.pages.some((p) => p.items.some((it) => it.id === id)) ?? false
}

function prependOptimisticThread(qc: RqClient, entry: ConvListItem) {
  qc.setQueriesData<ConvListInfinite>({ queryKey: ['chat-conversations', '__all__'] }, (prev) => {
    if (!prev) return prev
    if (listContains(prev, entry.id)) return prev
    const [first, ...rest] = prev.pages
    const head = first ?? { items: [], nextCursor: null }
    return {
      ...prev,
      pages: [{ ...head, items: [entry, ...head.items] }, ...rest],
    }
  })
}

function bumpOptimisticThread(qc: RqClient, conversationId: string, preview: string) {
  qc.setQueriesData<ConvListInfinite>({ queryKey: ['chat-conversations', '__all__'] }, (prev) => {
    if (!prev) return prev
    const now = new Date().toISOString()
    return {
      ...prev,
      pages: prev.pages.map((p) => ({
        ...p,
        items: p.items.map((c) =>
          c.id === conversationId ? { ...c, preview, lastMessageAt: now } : c,
        ),
      })),
    }
  })
}

export type RecordOptimisticThread = (
  conversationId: string,
  venueId: string,
  previewSource: string,
) => void

export function useOptimisticThreads(
  queryClient: RqClient,
  venues: VenueListItem[] | undefined,
): RecordOptimisticThread {
  // Sidebar optimistic update: first message → prepend a new row at the conv
  // UUID (server will upsert with the same id). Subsequent messages → bump +
  // preview. The infinite-query cache may have multiple entries (different
  // q/limit on the history page) — checking just one is enough to decide
  // prepend-vs-bump because either branch fans out to all matching entries
  // via setQueriesData.
  return useCallback(
    (conversationId, venueId, previewSource) => {
      const lists = queryClient.getQueriesData<ConvListInfinite>({
        queryKey: ['chat-conversations', '__all__'],
      })
      const existsInSidebar = lists.some(([, data]) => listContains(data, conversationId))
      const preview = previewSource.length > 80 ? `${previewSource.slice(0, 79)}…` : previewSource
      if (!existsInSidebar) {
        const venueName = venues?.find((v) => v.id === venueId)?.name ?? '—'
        prependOptimisticThread(queryClient, {
          id: conversationId,
          venueId,
          venueName,
          lastMessageAt: new Date().toISOString(),
          preview,
        })
      } else {
        bumpOptimisticThread(queryClient, conversationId, preview)
      }
    },
    [queryClient, venues],
  )
}
