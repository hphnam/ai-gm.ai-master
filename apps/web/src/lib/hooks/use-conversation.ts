'use client'

import { useQuery } from '@tanstack/react-query'
import type { ConversationResponseDto as ConversationResponse } from '@/generated/api'
import { ApiError, apiFetch } from '../api-client'

export function useConversation(
  conversationId: string | null,
  venueId: string | null,
  opts?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['conversation', conversationId, venueId],
    queryFn: async ({ signal }): Promise<ConversationResponse> => {
      try {
        return await apiFetch<ConversationResponse>(
          `/chat/conversations/${conversationId}?venueId=${venueId}`,
          { signal },
        )
      } catch (err) {
        // Client-generated UUIDs aren't persisted until the first send, so a
        // 404 just means "blank chat" — return an empty shell so the UI can
        // render instantly.
        if (err instanceof ApiError && err.status === 404) {
          return {
            id: conversationId!,
            venueId: venueId!,
            channel: 'web',
            messages: [],
          }
        }
        throw err
      }
    },
    enabled: Boolean(conversationId && venueId) && opts?.enabled !== false,
  })
}
