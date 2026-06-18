'use client'

import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import type {
  ActiveStaffResponseDto,
  CostsResponseDto,
  EscalationsResponseDto,
  HoursRecoveredResponseDto,
  MetricsFeedbackResponseDto,
  NoDataQueriesResponseDto,
  OnboardingCohortResponseDto,
  PricingFunnelResponseDto,
  RecentEscalationsResponseDto,
  SearchOutcomesResponseDto,
  TopQuestionsResponseDto,
  WauResponseDto,
} from '@/generated/api'
import { apiFetch } from '@/lib/api-client'

/// Preset ranges the dashboard exposes. Caps line up with the backend's
/// 366-day window cap on the analytics endpoints. "1y" = 365d to stay under
/// that ceiling.
export const RANGE_PRESETS = {
  '7d': { label: 'Last 7 days', days: 7 },
  '30d': { label: 'Last 30 days', days: 30 },
  '90d': { label: 'Last 90 days', days: 90 },
  '1y': { label: 'Last 12 months', days: 365 },
} as const

export type RangePreset = keyof typeof RANGE_PRESETS

/// Window for the dashboard, computed from a preset. Memoized on `preset` so
/// the React Query keys stay stable inside a render pass — if we rebuilt the
/// ISO strings every render, every query key would invalidate simultaneously
/// and refire all dashboard fetches. The snapshot only moves when the user
/// changes the preset or remounts the page.
export function useDashboardRange(preset: RangePreset): { from: string; to: string } {
  return useMemo(() => {
    const { days } = RANGE_PRESETS[preset]
    const now = new Date()
    now.setUTCMinutes(0, 0, 0)
    const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    from.setUTCHours(0, 0, 0, 0)
    return { from: from.toISOString(), to: now.toISOString() }
  }, [preset])
}

type Scope = { venueId?: string; from: string; to: string }

function buildQuery(s: Scope, extra?: Record<string, string | number>): string {
  const p = new URLSearchParams({ from: s.from, to: s.to })
  if (s.venueId) p.set('venueId', s.venueId)
  if (extra) {
    for (const [k, v] of Object.entries(extra)) p.set(k, String(v))
  }
  return p.toString()
}

export function useSearchOutcomes(scope: Scope) {
  return useQuery<SearchOutcomesResponseDto>({
    queryKey: ['metrics', 'search-outcomes', scope],
    queryFn: ({ signal }) =>
      apiFetch<SearchOutcomesResponseDto>(`/metrics/search-outcomes?${buildQuery(scope)}`, {
        signal,
      }),
    staleTime: 60_000,
    retry: false,
  })
}

export function useEscalations(scope: Scope) {
  return useQuery<EscalationsResponseDto>({
    queryKey: ['metrics', 'escalations', scope],
    queryFn: ({ signal }) =>
      apiFetch<EscalationsResponseDto>(`/metrics/escalations?${buildQuery(scope)}`, { signal }),
    staleTime: 60_000,
    retry: false,
  })
}

export function useCosts(scope: Scope) {
  return useQuery<CostsResponseDto>({
    queryKey: ['metrics', 'costs', scope],
    queryFn: ({ signal }) =>
      apiFetch<CostsResponseDto>(`/metrics/costs?${buildQuery(scope)}`, { signal }),
    staleTime: 60_000,
    retry: false,
  })
}

export function useFeedback(scope: Scope) {
  return useQuery<MetricsFeedbackResponseDto>({
    queryKey: ['metrics', 'feedback', scope],
    queryFn: ({ signal }) =>
      apiFetch<MetricsFeedbackResponseDto>(`/metrics/feedback?${buildQuery(scope)}`, { signal }),
    staleTime: 60_000,
    retry: false,
  })
}

export function useNoDataQueries(scope: Scope, limit = 10) {
  return useQuery<NoDataQueriesResponseDto>({
    queryKey: ['metrics', 'no-data-queries', scope, limit],
    queryFn: ({ signal }) =>
      apiFetch<NoDataQueriesResponseDto>(
        `/metrics/no-data-queries?${buildQuery(scope, { limit })}`,
        { signal },
      ),
    staleTime: 60_000,
    retry: false,
  })
}

export function usePricingFunnel(opts: { venueId?: string }) {
  const query = opts.venueId ? `?venueId=${opts.venueId}` : ''
  return useQuery<PricingFunnelResponseDto>({
    queryKey: ['metrics', 'pricing-funnel', opts.venueId ?? null],
    queryFn: ({ signal }) =>
      apiFetch<PricingFunnelResponseDto>(`/metrics/pricing-funnel${query}`, { signal }),
    staleTime: 60_000,
    retry: false,
  })
}

export function useOnboardingCohort() {
  return useQuery<OnboardingCohortResponseDto>({
    queryKey: ['metrics', 'onboarding-cohort'],
    queryFn: ({ signal }) =>
      apiFetch<OnboardingCohortResponseDto>('/metrics/onboarding-cohort', { signal }),
    staleTime: 60_000,
    retry: false,
  })
}

export function useHoursRecovered(scope: Scope) {
  return useQuery<HoursRecoveredResponseDto>({
    queryKey: ['metrics', 'hours-recovered', scope],
    queryFn: ({ signal }) =>
      apiFetch<HoursRecoveredResponseDto>(`/metrics/hours-recovered?${buildQuery(scope)}`, {
        signal,
      }),
    staleTime: 60_000,
    retry: false,
  })
}

export function useTopQuestions(scope: Scope, limit = 10) {
  return useQuery<TopQuestionsResponseDto>({
    queryKey: ['metrics', 'top-questions', scope, limit],
    queryFn: ({ signal }) =>
      apiFetch<TopQuestionsResponseDto>(`/metrics/top-questions?${buildQuery(scope, { limit })}`, {
        signal,
      }),
    staleTime: 60_000,
    retry: false,
  })
}

export function useRecentEscalations(scope: Scope, limit = 8) {
  return useQuery<RecentEscalationsResponseDto>({
    queryKey: ['metrics', 'recent-escalations', scope, limit],
    queryFn: ({ signal }) =>
      apiFetch<RecentEscalationsResponseDto>(
        `/metrics/recent-escalations?${buildQuery(scope, { limit })}`,
        { signal },
      ),
    staleTime: 60_000,
    retry: false,
  })
}

export function useActiveStaff(scope: Scope, limit = 8) {
  return useQuery<ActiveStaffResponseDto>({
    queryKey: ['metrics', 'active-staff', scope, limit],
    queryFn: ({ signal }) =>
      apiFetch<ActiveStaffResponseDto>(`/metrics/active-staff?${buildQuery(scope, { limit })}`, {
        signal,
      }),
    staleTime: 60_000,
    retry: false,
  })
}

export function useVenueWau(venueId: string | undefined) {
  return useQuery<WauResponseDto>({
    queryKey: ['metrics', 'wau', venueId ?? null],
    queryFn: ({ signal }) =>
      apiFetch<WauResponseDto>(`/metrics/wau?venueId=${venueId!}&weeks=12`, { signal }),
    enabled: Boolean(venueId),
    staleTime: 60_000,
    retry: false,
  })
}
