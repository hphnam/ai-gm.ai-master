'use client'

import { useQuery } from '@tanstack/react-query'
import type { DebugConversationResponse } from '@gm-ai/types'
import { apiFetchWithMeta } from '@/lib/api-client'

export function useDebugConversation(conversationId: string | null, venueId: string | null) {
  return useQuery({
    queryKey: ['debug', 'conversation', conversationId, venueId],
    queryFn: () =>
      apiFetchWithMeta<DebugConversationResponse>(
        `/debug/conversations/${conversationId}?venueId=${venueId}`,
      ),
    enabled: Boolean(conversationId && venueId),
    staleTime: 10_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}
