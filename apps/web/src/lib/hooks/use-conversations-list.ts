'use client'

import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { API_URL, apiFetch } from '@/lib/api-client'

export type ConvListItem = {
  id: string
  venueId: string
  venueName: string
  lastMessageAt: string
  preview: string | null
}

type ConvListPage = {
  items: ConvListItem[]
  nextCursor: string | null
}

type UseConversationsListOptions = {
  /// Page size. Server clamps to [1, 100]. Default 30 matches the sidebar's
  /// "visible above the fold" target on a typical laptop.
  limit?: number
  /// Free-text search across venue name + first user message.
  q?: string
  /// Set false to pause fetching (e.g. while the user is still typing in the
  /// debounced search input).
  enabled?: boolean
}

export function useConversationsList(
  venueId: string | null,
  opts: UseConversationsListOptions = {},
) {
  const { limit = 30, q, enabled = true } = opts
  // Server requires q.length >= 2 — drop shorter queries client-side so the
  // user can type "a" without triggering a 400. An empty string disables
  // the filter entirely.
  const rawTrim = q?.trim() ?? ''
  const trimmedQ = rawTrim.length >= 2 ? rawTrim : ''
  const venueKey = venueId ?? '__all__'

  const query = useInfiniteQuery<ConvListPage>({
    queryKey: ['chat-conversations', venueKey, { q: trimmedQ, limit }],
    queryFn: ({ signal, pageParam }) => {
      const params = new URLSearchParams()
      if (venueId) params.set('venueId', venueId)
      params.set('limit', String(limit))
      if (trimmedQ) params.set('q', trimmedQ)
      if (pageParam) params.set('cursor', pageParam as string)
      return apiFetch<ConvListPage>(`/chat/conversations?${params.toString()}`, { signal })
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 30_000,
    enabled,
  })

  const items = useMemo(() => query.data?.pages.flatMap((p) => p.items) ?? [], [query.data])

  return { ...query, items }
}

export function useDeleteConversation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (args: { conversationId: string; venueId: string }) => {
      const res = await fetch(
        `${API_URL}/chat/conversations/${args.conversationId}?venueId=${args.venueId}`,
        { method: 'DELETE', credentials: 'include' },
      )
      if (!res.ok && res.status !== 204) {
        throw new Error(`delete failed: ${res.status}`)
      }
    },
    onSuccess: (_data, { conversationId, venueId }) => {
      queryClient.removeQueries({
        queryKey: ['conversation', conversationId, venueId],
      })
      queryClient.invalidateQueries({ queryKey: ['chat-conversations'] })
    },
  })
}
