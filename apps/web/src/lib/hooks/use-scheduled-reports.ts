'use client'

import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError, apiFetch, apiPost } from '@/lib/api-client'

const SCHEDULES_PAGE_SIZE = 20

export type ScheduleFrequency = 'daily' | 'weekly' | 'monthly'
export type ScheduleStatus = 'active' | 'paused' | 'cancelled'

export type ScheduledReport = {
  id: string
  organizationId: string
  venueId: string | null
  createdByUserId: string | null
  createdByName: string | null
  title: string
  summary: string | null
  frequency: ScheduleFrequency
  hourOfDay: number
  dayOfWeek: number | null
  dayOfMonth: number | null
  timezone: string
  prompt: string | null
  status: ScheduleStatus
  nextRunAt: string
  lastRunAt: string | null
  lastReportId: string | null
  runCount: number
  createdAt: string
  updatedAt: string
}

export type CreateScheduledReportBody = {
  venueId?: string | null
  title: string
  summary?: string
  frequency: ScheduleFrequency
  hourOfDay?: number
  dayOfWeek?: number | null
  dayOfMonth?: number | null
  timezone?: string
  prompt?: string
}

const KEY = ['scheduled-reports'] as const

type ScheduledReportsPage = {
  schedules: ScheduledReport[]
  total: number
  hasMore: boolean
  nextOffset: number | null
}

export function useScheduledReports(opts?: { status?: ScheduleStatus | 'all'; pageSize?: number }) {
  const status = opts?.status ?? 'active'
  const pageSize = opts?.pageSize ?? SCHEDULES_PAGE_SIZE
  return useInfiniteQuery<
    ScheduledReportsPage,
    Error,
    InfiniteData<ScheduledReportsPage>,
    readonly unknown[],
    number
  >({
    queryKey: [...KEY, 'list', { status, pageSize }],
    initialPageParam: 0,
    queryFn: ({ pageParam, signal }) => {
      const qs = new URLSearchParams()
      qs.set('status', status)
      qs.set('limit', String(pageSize))
      qs.set('offset', String(pageParam))
      return apiFetch(`/scheduled-reports?${qs.toString()}`, { signal })
    },
    getNextPageParam: (last) => last.nextOffset ?? undefined,
    staleTime: 30_000,
  })
}

export function useCreateScheduledReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: CreateScheduledReportBody) =>
      apiPost<ScheduledReport>('/scheduled-reports', body),
    onSuccess: (schedule) => {
      queryClient.invalidateQueries({ queryKey: KEY })
      toast.success(
        `Schedule created — next run ${formatNextRunForToast(schedule.nextRunAt, schedule.timezone)}.`,
      )
    },
    // Errors on create stay in the dialog (inline message) — toasting on top of
    // that would double-surface the same error and break the confirm flow.
  })
}

const VERB_SUCCESS: Record<'pause' | 'resume' | 'cancel', string> = {
  pause: 'Schedule paused.',
  resume: 'Schedule resumed.',
  cancel: 'Schedule cancelled.',
}

const VERB_ERROR: Record<'pause' | 'resume' | 'cancel', string> = {
  pause: "Couldn't pause the schedule.",
  resume: "Couldn't resume the schedule.",
  cancel: "Couldn't cancel the schedule.",
}

function useStatusMutation(verb: 'pause' | 'resume' | 'cancel') {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<ScheduledReport>(`/scheduled-reports/${id}/${verb}`, { method: 'PATCH' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY })
      toast.success(VERB_SUCCESS[verb])
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError && err.status === 404
          ? 'Schedule no longer exists.'
          : VERB_ERROR[verb]
      toast.error(msg)
    },
  })
}

export const usePauseScheduledReport = () => useStatusMutation('pause')
export const useResumeScheduledReport = () => useStatusMutation('resume')
export const useCancelScheduledReport = () => useStatusMutation('cancel')

export function useDeleteScheduledReport() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch<void>(`/scheduled-reports/${id}`, { method: 'DELETE' })
      return id
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: KEY })
      toast.success('Schedule deleted.')
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError && err.status === 404
          ? 'Schedule no longer exists.'
          : "Couldn't delete the schedule."
      toast.error(msg)
    },
  })
}

function formatNextRunForToast(iso: string, timezone: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'soon'
  // Render in the schedule's own timezone — the user picked it deliberately
  // (e.g. Europe/London) and the toast should match the cadence they set,
  // not the laptop they happen to be on.
  try {
    return d.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timezone,
      timeZoneName: 'short',
    })
  } catch {
    return d.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  }
}
