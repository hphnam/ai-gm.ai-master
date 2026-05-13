'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch, apiPost } from '@/lib/api-client'

export type NotificationSource = 'chat' | 'whatsapp' | 'manual'
export type NotificationStatus = 'unread' | 'read'

export type Notification = {
  id: string
  body: string
  source: NotificationSource
  status: NotificationStatus
  createdAt: string
  readAt: string | null
  author: { id: string; name: string | null; email: string } | null
}

export type ListNotificationsResponse = {
  notifications: Notification[]
  unreadCount: number
}

export type Recipient = {
  userId: string
  name: string | null
  email: string
  role: string
}

const LIST_KEY = ['notifications', 'list'] as const
const COUNT_KEY = ['notifications', 'unread-count'] as const
const RECIPIENTS_KEY = ['notifications', 'recipients'] as const

export function useNotifications(opts?: { enabled?: boolean }) {
  return useQuery<ListNotificationsResponse>({
    queryKey: LIST_KEY,
    queryFn: ({ signal }) =>
      apiFetch<ListNotificationsResponse>('/notifications?limit=30', { signal }),
    enabled: opts?.enabled ?? true,
    staleTime: 15_000,
  })
}

export function useUnreadNotificationsCount() {
  return useQuery<{ count: number }>({
    queryKey: COUNT_KEY,
    queryFn: ({ signal }) => apiFetch<{ count: number }>('/notifications/unread-count', { signal }),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    staleTime: 10_000,
  })
}

export function useNotificationRecipients(opts?: { enabled?: boolean }) {
  return useQuery<{ members: Recipient[] }>({
    queryKey: RECIPIENTS_KEY,
    queryFn: ({ signal }) =>
      apiFetch<{ members: Recipient[] }>('/notifications/recipients', { signal }),
    enabled: opts?.enabled ?? false,
    staleTime: 5 * 60_000,
  })
}

export function useMarkNotificationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      return apiFetch<{ notification: Notification }>(`/notifications/${id}/read`, {
        method: 'PATCH',
      })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY })
      qc.invalidateQueries({ queryKey: COUNT_KEY })
    },
  })
}

export function useMarkAllNotificationsRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      return apiFetch<{ updated: number }>('/notifications/read-all', { method: 'PATCH' })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY })
      qc.invalidateQueries({ queryKey: COUNT_KEY })
    },
  })
}

export function useComposeNotification() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { recipientUserId: string; body: string }) => {
      return apiPost<{ notification: Notification }>('/notifications', input)
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: LIST_KEY })
      qc.invalidateQueries({ queryKey: COUNT_KEY })
    },
  })
}
