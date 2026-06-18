'use client'

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'

export type StarterQuestion = {
  text: string
  category?: string
}

export type ChatStartersPayload = {
  venueId: string
  questions: StarterQuestion[]
  source: 'generated' | 'fallback'
  generatedAt: string | null
}

/// Read-only fetch of the venue's rotating starter prompts. The backend
/// always returns SOMETHING — either the most recently generated payload
/// (refreshed weekly by a BullMQ tick) or a generic fallback when Redis is
/// empty / unreachable. Suspense-free; the UI degrades to a static prompt
/// list while loading.
export function useChatStarters(venueId: string | null) {
  return useQuery<ChatStartersPayload>({
    queryKey: ['chat-starters', venueId],
    queryFn: ({ signal }) =>
      apiFetch<ChatStartersPayload>(`/chat-starters?venueId=${venueId}`, { signal }),
    enabled: Boolean(venueId),
    // Generated payloads have a 14-day server-side TTL and rotate weekly.
    // 10 min on the client keeps a freshly-rotated set visible without
    // refetching on every render.
    staleTime: 10 * 60_000,
  })
}
