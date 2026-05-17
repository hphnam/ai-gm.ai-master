'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'

export type IncidentSeverity = 'minor' | 'major' | 'critical'
export type IncidentStatus = 'open' | 'acknowledged' | 'closed'

export type IncidentParty = {
  userId: string
  name: string | null
  email: string | null
}

export type Incident = {
  id: string
  organizationId: string
  venueId: string
  venueName: string
  severity: IncidentSeverity
  status: IncidentStatus
  summary: string
  loggedBy: IncidentParty | null
  sourceMessageId: string | null
  sourceConversationId: string | null
  details: Record<string, unknown>
  commentCount: number
  createdAt: string
  updatedAt: string
}

export type ListIncidentsResponse = {
  incidents: Incident[]
  openCount: number
  criticalOpenCount: number
}

type ListIncidentsFilter = {
  status?: IncidentStatus
  severity?: IncidentSeverity
  venueId?: string
}

function buildQuery(opts: ListIncidentsFilter): string {
  const p = new URLSearchParams()
  if (opts.status) p.set('status', opts.status)
  if (opts.severity) p.set('severity', opts.severity)
  if (opts.venueId) p.set('venueId', opts.venueId)
  return p.toString()
}

export function useIncidents(filter: ListIncidentsFilter) {
  return useQuery<ListIncidentsResponse>({
    queryKey: ['incidents', filter],
    queryFn: ({ signal }) => {
      const q = buildQuery(filter)
      return apiFetch<ListIncidentsResponse>(`/incidents${q ? `?${q}` : ''}`, { signal })
    },
    staleTime: 30_000,
    retry: false,
  })
}

/// Lightweight badge query for the sidebar — same shape as the tasks /
/// compliance count hooks. Hits the list endpoint with limit=1 so the row
/// payload stays tiny while the count aggregates (`openCount`,
/// `criticalOpenCount`) still come back. Cached separately from the full
/// `useIncidents` query so list reads on /incidents don't trigger badge
/// refetches and vice versa.
export function useOpenIncidentsCount() {
  return useQuery<{ openCount: number; criticalOpenCount: number }>({
    queryKey: ['incidents-open-count'],
    queryFn: async ({ signal }) => {
      const res = await apiFetch<ListIncidentsResponse>('/incidents?status=open&limit=1', {
        signal,
      })
      return { openCount: res.openCount, criticalOpenCount: res.criticalOpenCount }
    },
    refetchOnWindowFocus: true,
    staleTime: 30_000,
    retry: false,
  })
}

export function useUpdateIncidentStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      status,
      resolution,
    }: {
      id: string
      status: IncidentStatus
      resolution?: string
    }) => {
      return apiFetch<{ incident: Incident }>(`/incidents/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(resolution ? { status, resolution } : { status }),
      })
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ['incidents'] })
      qc.invalidateQueries({ queryKey: ['incident-comments', vars.id] })
    },
  })
}

export type IncidentCommentKind = 'comment' | 'status_change'

export type IncidentComment = {
  id: string
  incidentId: string
  kind: IncidentCommentKind
  body: string
  meta: Record<string, unknown>
  author: IncidentParty | null
  createdAt: string
}

export function useIncidentComments(incidentId: string, enabled: boolean) {
  return useQuery<{ comments: IncidentComment[] }>({
    queryKey: ['incident-comments', incidentId],
    queryFn: ({ signal }) =>
      apiFetch<{ comments: IncidentComment[] }>(`/incidents/${incidentId}/comments`, { signal }),
    staleTime: 15_000,
    enabled,
    retry: false,
  })
}

export function useAddIncidentComment(incidentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: string) =>
      apiFetch<{ comment: IncidentComment }>(`/incidents/${incidentId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body }),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incident-comments', incidentId] })
      // commentCount on the list row needs a refresh — easier than patching
      // the in-memory list manually.
      qc.invalidateQueries({ queryKey: ['incidents'] })
    },
  })
}

export function useDeleteIncident() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => apiFetch<void>(`/incidents/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incidents'] })
    },
  })
}

export function useDeleteIncidentComment(incidentId: string) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (commentId: string) =>
      apiFetch<void>(`/incidents/${incidentId}/comments/${commentId}`, {
        method: 'DELETE',
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['incident-comments', incidentId] })
      qc.invalidateQueries({ queryKey: ['incidents'] })
    },
  })
}
