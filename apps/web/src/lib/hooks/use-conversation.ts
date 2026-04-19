'use client'

import { useQuery } from '@tanstack/react-query'
import type { ConversationResponse } from '@gm-ai/types'
import { apiFetch } from '../api-client'

export function useConversation(
  conversationId: string | null,
  venueId: string | null,
) {
  return useQuery({
    queryKey: ['conversation', conversationId, venueId],
    queryFn: ({ signal }) =>
      apiFetch<ConversationResponse>(
        `/chat/conversations/${conversationId}?venueId=${venueId}`,
        { signal },
      ),
    enabled: Boolean(conversationId && venueId),
  })
}
