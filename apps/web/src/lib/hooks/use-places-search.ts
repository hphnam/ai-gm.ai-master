'use client'

import { useQuery } from '@tanstack/react-query'
import { apiPost } from '@/lib/api-client'

export interface PlaceCandidate {
  placeId: string
  name: string
  address: string | null
  businessType: string | null
  venueType: string
  country: string | null
  currency: string | null
  timezone: string | null
  openingHours: string | null
  description: string | null
}

export interface PlacesSearchResponse {
  available: boolean
  candidates: PlaceCandidate[]
  error?: 'lookup-failed'
}

export function usePlacesSearch(query: string) {
  const trimmed = query.trim()
  return useQuery<PlacesSearchResponse>({
    queryKey: ['places-search', trimmed],
    queryFn: ({ signal }) =>
      apiPost<PlacesSearchResponse>('/places/search', { query: trimmed }, signal),
    enabled: trimmed.length >= 2,
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
}
