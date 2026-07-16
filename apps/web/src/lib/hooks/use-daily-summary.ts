'use client'

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'

/// One venue's settled trading day (venue-local "yesterday"). Every figure is
/// nullable — a venue may lack Square, a mapped location, or costed items, in
/// which case the UI shows a connect/empty state rather than a number.
export type VenueDailySummary = {
  venueId: string
  venueName: string
  date: string
  currency: string | null
  netSales: number | null
  grossSales: number | null
  cogs: number | null
  gpPct: number | null
  labourCost: number | null
  labourPct: number | null
  /// Completed tickets (split-paid counted once) — NOT guest covers.
  tickets: number | null
  coverageRate: number
  gpDeltaPts: number | null
  labourDeltaPts: number | null
  netSalesPrev: number | null
  connected: boolean
  noData: string | null
}

export type GroupDailySummary = {
  date: string
  currency: string | null
  venues: VenueDailySummary[]
  group: {
    netSales: number | null
    gpPct: number | null
    labourPct: number | null
    gpDeltaPts: number | null
  }
}

type Wrapped<T> = { data: T | null; error: string | null }

/// Single-venue daily summary. Manager/owner only (the endpoint 403s staff);
/// callers gate the hook with `enabled` on role + venueId.
export function useDailySummary(venueId: string | null, enabled = true) {
  return useQuery<VenueDailySummary | null>({
    queryKey: ['daily-summary', venueId],
    queryFn: async ({ signal }) => {
      const res = await apiFetch<Wrapped<VenueDailySummary>>(`/daily-summary?venueId=${venueId}`, {
        signal,
      })
      return res.data
    },
    enabled: enabled && Boolean(venueId),
    // Yesterday's figures are effectively static; the server caches 30 min.
    staleTime: 10 * 60_000,
  })
}

/// Group roll-up across the caller's accessible venues (owner's Today home).
export function useDailySummaryGroup(enabled = true) {
  return useQuery<GroupDailySummary | null>({
    queryKey: ['daily-summary', 'group'],
    queryFn: async ({ signal }) => {
      const res = await apiFetch<Wrapped<GroupDailySummary>>('/daily-summary/group', { signal })
      return res.data
    },
    enabled,
    staleTime: 10 * 60_000,
  })
}
