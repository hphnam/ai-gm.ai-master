'use client'

import { useMutation, useQuery } from '@tanstack/react-query'
import type {
  ProactiveSuggestionDto as ProactiveSuggestion,
  SuggestionsOnTurnRequestDto as SuggestionsOnTurnRequest,
} from '@/generated/api'
import { apiPost } from '../api-client'

export function useOnOpenSuggestions(venueId: string | null) {
  return useQuery({
    queryKey: ['suggestions', 'open', venueId],
    queryFn: ({ signal }) =>
      apiPost<ProactiveSuggestion[]>('/suggestions/on-open', { venueId }, signal),
    enabled: Boolean(venueId),
    staleTime: 5 * 60_000,
  })
}

export function useOnTurnSuggestions() {
  return useMutation({
    mutationFn: (body: SuggestionsOnTurnRequest) =>
      apiPost<ProactiveSuggestion[]>('/suggestions/on-turn', body),
  })
}
