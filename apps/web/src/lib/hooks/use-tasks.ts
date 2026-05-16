'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ApiError, apiFetch, apiPost } from '@/lib/api-client'

export type TaskStatus = 'open' | 'done' | 'cancelled'

export type Task = {
  id: string
  organizationId: string
  venueId: string | null
  assignee: { userId: string; name: string | null; email: string }
  creator: { userId: string; name: string | null; email: string } | null
  body: string
  dueAt: string | null
  status: TaskStatus
  category: string | null
  sourceConversationId: string | null
  sourceMessageId: string | null
  remindedAt: string | null
  completedAt: string | null
  createdAt: string
  updatedAt: string
}

export type ListTasksResponse = {
  tasks: Task[]
  openCount: number
  overdueCount: number
}

export type TasksScope = 'mine' | 'authored' | 'all'
export type TasksStatusFilter = 'open' | 'done' | 'cancelled' | 'all'

const LIST_KEY = (status: TasksStatusFilter, scope: TasksScope) =>
  ['tasks', 'list', { status, scope }] as const
const OPEN_COUNT_KEY = ['tasks', 'open-count'] as const

export function useTasks(opts?: {
  status?: TasksStatusFilter
  scope?: TasksScope
  enabled?: boolean
}) {
  const status = opts?.status ?? 'open'
  const scope = opts?.scope ?? 'mine'
  return useQuery<ListTasksResponse>({
    queryKey: LIST_KEY(status, scope),
    queryFn: ({ signal }) =>
      apiFetch<ListTasksResponse>(`/tasks?status=${status}&scope=${scope}&limit=100`, {
        signal,
      }),
    enabled: opts?.enabled ?? true,
    staleTime: 15_000,
  })
}

/// Lightweight badge query — keeps the sidebar count cheap. Mirrors the API
/// list endpoint but caches separately so list reads don't trigger badge
/// refetches and vice versa.
export function useOpenTasksCount() {
  return useQuery<{ openCount: number; overdueCount: number }>({
    queryKey: OPEN_COUNT_KEY,
    queryFn: async ({ signal }) => {
      const res = await apiFetch<ListTasksResponse>('/tasks?status=open&scope=mine&limit=1', {
        signal,
      })
      return { openCount: res.openCount, overdueCount: res.overdueCount }
    },
    refetchOnWindowFocus: true,
    staleTime: 30_000,
  })
}

export function useCreateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      body: string
      dueAt?: string | null
      assigneeUserId?: string | null
      venueId?: string | null
      category?: string | null
    }) => apiPost<{ task: Task }>('/tasks', input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useUpdateTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: string
      body?: string
      dueAt?: string | null
      status?: TaskStatus
      category?: string | null
    }) => {
      const { id, ...patch } = input
      return apiFetch<{ task: Task }>(`/tasks/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
    },
  })
}

export function useDeleteTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await apiFetch<void>(`/tasks/${id}`, { method: 'DELETE' })
      return id
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tasks'] })
      toast.success('Task deleted.')
    },
    onError: (err) => {
      const msg =
        err instanceof ApiError && err.status === 404
          ? 'Task already removed.'
          : err instanceof ApiError && err.status === 403
            ? "You don't have permission to delete this task."
            : "Couldn't delete the task."
      toast.error(msg)
    },
  })
}
