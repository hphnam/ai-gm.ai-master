'use client'

import { useQuery } from '@tanstack/react-query'
import type { VenueListItem } from '@gm-ai/types'
import { apiFetch } from '../api-client'

export function useVenues() {
  return useQuery({
    queryKey: ['venues'],
    queryFn: ({ signal }) => apiFetch<VenueListItem[]>('/venues', { signal }),
    staleTime: 5 * 60_000,
  })
}
