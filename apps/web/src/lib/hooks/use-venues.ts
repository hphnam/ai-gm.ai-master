'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type {
  CreateVenueBodyDto as CreateVenueBody,
  UpdateVenueProfileDto as UpdateVenueProfile,
  VenueDetailDto as VenueDetail,
  VenueListItemDto as VenueListItem,
} from '@/generated/api'
import type { ApiErrorCode } from '@/lib/api-errors'
import { API_URL, ApiError, apiFetch, apiPost } from '../api-client'

export function useVenues() {
  return useQuery({
    queryKey: ['venues'],
    queryFn: ({ signal }) => apiFetch<VenueListItem[]>('/venues', { signal }),
    staleTime: 5 * 60_000,
  })
}

export function useVenue(id: string | null) {
  return useQuery<VenueDetail>({
    queryKey: ['venues', id],
    queryFn: ({ signal }) => apiFetch<VenueDetail>(`/venues/${id!}`, { signal }),
    enabled: Boolean(id),
    staleTime: 60_000,
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

export function useUpdateVenueProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string
      patch: UpdateVenueProfile
    }): Promise<VenueDetail> => {
      const requestId = crypto.randomUUID()
      const res = await fetch(`${API_URL}/venues/${id}/profile`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          'x-request-id': requestId,
        },
        body: JSON.stringify(patch),
      })
      if (!res.ok) {
        const text = await res.text()
        let body: { error?: string } | null = null
        try {
          body = text ? (JSON.parse(text) as { error?: string }) : null
        } catch {
          body = null
        }
        throw new ApiError(
          res.status,
          (body?.error as ApiErrorCode | undefined) ?? 'unknown',
          undefined,
          res.headers.get('x-request-id') ?? requestId,
        )
      }
      return (await res.json()) as VenueDetail
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['venues', data.id], data)
      queryClient.invalidateQueries({ queryKey: ['venues'] })
    },
  })
}

export function useRunNudge() {
  return useMutation({
    mutationFn: (venueId: string) =>
      apiPost<{ sent: boolean; reason?: string; preview?: string }>(`/nudges/${venueId}/run`, {}),
  })
}
