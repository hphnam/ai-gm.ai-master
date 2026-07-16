'use client'

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'

export type StarterQuestion = {
  text: string
  category?: string
}

export type ChatStartersPayload = {
  venueId: string
  audience: 'staff' | 'manager'
  questions: StarterQuestion[]
  source: 'generated' | 'fallback'
  generatedAt: string | null
}

/// Read-only fetch of the venue's rotating starter prompts. The backend serves
/// a set tailored to the caller's role (derived server-side from the session),
/// so no role param is sent here. It always returns SOMETHING — either the most
/// recently generated payload (refreshed every few days by a BullMQ tick) or a
/// role-appropriate generic fallback when Redis is empty / unreachable.
/// Suspense-free; the UI degrades to a static prompt list while loading.
export function useChatStarters(venueId: string | null) {
  return useQuery<ChatStartersPayload>({
    queryKey: ['chat-starters', venueId],
    queryFn: ({ signal }) =>
      apiFetch<ChatStartersPayload>(`/chat-starters?venueId=${venueId}`, { signal }),
    enabled: Boolean(venueId),
    // Generated payloads have a multi-day server-side TTL and rotate every few
    // days. 10 min on the client keeps a freshly-rotated set visible without
    // refetching on every render.
    staleTime: 10 * 60_000,
  })
}
