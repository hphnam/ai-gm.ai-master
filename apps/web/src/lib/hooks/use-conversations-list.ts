'use client'

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'

type ConvListItem = { id: string; venueId: string; lastMessageAt: string }

export function useConversationsList(venueId: string | null) {
  return useQuery<ConvListItem[]>({
    queryKey: ['chat-conversations', venueId],
    queryFn: ({ signal }) =>
      apiFetch<ConvListItem[]>(`/chat/conversations?venueId=${venueId!}`, { signal }),
    enabled: Boolean(venueId),
    staleTime: 30_000,
  })
}
