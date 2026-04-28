'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { API_URL, apiFetch } from '@/lib/api-client'

export type ConvListItem = {
  id: string
  venueId: string
  venueName: string
  lastMessageAt: string
  preview: string | null
}

export function useConversationsList(venueId: string | null) {
  const key = venueId ?? '__all__'
  const path = venueId ? `/chat/conversations?venueId=${venueId}` : '/chat/conversations'
  return useQuery<ConvListItem[]>({
    queryKey: ['chat-conversations', key],
    queryFn: ({ signal }) => apiFetch<ConvListItem[]>(path, { signal }),
    staleTime: 30_000,
  })
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
