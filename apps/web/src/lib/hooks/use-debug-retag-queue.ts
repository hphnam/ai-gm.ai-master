'use client'

import { useQuery } from '@tanstack/react-query'
import type { DebugRetagQueueResponseDto as DebugRetagQueueResponse } from '@/generated/api'
import { apiFetchWithMeta } from '@/lib/api-client'

export function useDebugRetagQueue(venueId: string | null, limit = 50) {
  return useQuery({
    queryKey: ['debug', 'retag', venueId, limit],
    queryFn: () =>
      apiFetchWithMeta<DebugRetagQueueResponse>(
        `/debug/retag-queue?venueId=${venueId}&limit=${limit}`,
      ),
    enabled: Boolean(venueId),
    staleTime: 5_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
}
