'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateVenueBody, VenueListItem } from '@gm-ai/types'
import { apiFetch, apiPost } from '../api-client'

export function useVenues() {
  return useQuery({
    queryKey: ['venues'],
    queryFn: ({ signal }) => apiFetch<VenueListItem[]>('/venues', { signal }),
    staleTime: 5 * 60_000,
  })
}

export function useCreateVenue() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateVenueBody) => apiPost<VenueListItem>('/venues', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['venues'] })
    },
  })
}
