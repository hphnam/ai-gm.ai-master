'use client'

import {
  type InfiniteData,
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { API_URL, ApiError, apiFetch } from '@/lib/api-client'

const REPORTS_PAGE_SIZE = 20

export type ReportListItem = {
  id: string
  title: string
  summary: string | null
  venueId: string | null
  createdAt: string
}

export type Report = {
  id: string
  organizationId: string
  venueId: string | null
  createdByUserId: string | null
  createdByName: string | null
  title: string
  summary: string | null
  spec: ReportSpec
  createdAt: string
}

// Mirror of apps/api/src/types/reports.ts. Kept as types-only — the backend
// validates with Zod on read so the frontend trusts the shape.
export type ReportMoney = { value: number; currency: string | null }
export type ReportKpi = {
  label: string
  value: string | number | ReportMoney
  sublabel?: string
  trend?: { direction: 'up' | 'down' | 'flat'; percent?: number | null; label?: string }
}
export type ReportBarRow = {
  label: string
  value: number
  sublabel?: string
  tone?: 'neutral' | 'positive' | 'warning' | 'negative'
}
export type ReportSection =
  | { type: 'text'; body: string }
  | { type: 'kpi'; kpi: ReportKpi }
  | { type: 'kpiGroup'; title?: string; kpis: ReportKpi[] }
  | {
      type: 'bar'
      title?: string
      caption?: string
      rows: ReportBarRow[]
      unit?: string
    }
  | {
      type: 'table'
      title?: string
      columns: string[]
      rows: Array<Array<string | number | null>>
    }
  | { type: 'divider'; label?: string }
export type ReportSpec = {
  version?: number
  rangeFromIso?: string
  rangeToIso?: string
  sections: ReportSection[]
}

type ReportsPage = {
  reports: ReportListItem[]
  total: number
  hasMore: boolean
  nextOffset: number | null
}

export function reportsListOptions(venueId: string | null = null, pageSize = REPORTS_PAGE_SIZE) {
  return {
    queryKey: ['reports', 'list', { venueId, pageSize }] as const,
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }: { pageParam?: number; signal?: AbortSignal }) => {
      const qs = new URLSearchParams()
      if (venueId) qs.set('venueId', venueId)
      qs.set('limit', String(pageSize))
      qs.set('offset', String(pageParam ?? 0))
      return apiFetch<ReportsPage>(`/reports?${qs.toString()}`, { signal })
    },
    getNextPageParam: (last: ReportsPage) => last.nextOffset ?? undefined,
  }
}

export function useReports(opts?: { venueId?: string | null; pageSize?: number }) {
  const venueId = opts?.venueId ?? null
  const pageSize = opts?.pageSize ?? REPORTS_PAGE_SIZE
  return useInfiniteQuery<
    ReportsPage,
    Error,
    InfiniteData<ReportsPage>,
    readonly unknown[],
    number
  >({
    ...reportsListOptions(venueId, pageSize),
    placeholderData: keepPreviousData,
  })
}

export function reportDetailOptions(id: string) {
  return {
    queryKey: ['reports', 'one', id] as const,
    queryFn: ({ signal }: { signal?: AbortSignal }) =>
      apiFetch<Report>(`/reports/${id}`, { signal }),
  }
}

export function useReport(id: string | null) {
  return useQuery<Report>({
    ...reportDetailOptions(id ?? ''),
    enabled: typeof id === 'string' && id.length > 0,
    staleTime: 60_000,
  })
}

export function useDeleteReport() {
  const queryClient = useQueryClient()
  return useMutation({
    // The endpoint returns 204 No Content — apiFetch always tries to JSON-
    // parse the body and would throw, so we go through raw fetch here.
    mutationFn: async (id: string): Promise<void> => {
      const requestId = crypto.randomUUID()
      const res = await fetch(`${API_URL}/reports/${id}`, {
        method: 'DELETE',
        credentials: 'include',
        headers: { 'x-request-id': requestId },
      })
      if (!res.ok) {
        throw new ApiError(
          res.status,
          'unknown',
          undefined,
          res.headers.get('x-request-id') ?? requestId,
        )
      }
    },
    onSuccess: (_data, id) => {
      // Drop the detail-page cache for this id so a stale navigation doesn't
      // show a "ghost" report after the optimistic redirect.
      queryClient.removeQueries({ queryKey: ['reports', 'one', id] })
      queryClient.invalidateQueries({ queryKey: ['reports', 'list'] })
      toast.success('Report deleted.')
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError && err.status === 404
          ? 'Report already removed.'
          : "Couldn't delete the report."
      toast.error(msg)
    },
  })
}
