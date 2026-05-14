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
  // Polling-free — the realtime socket pushes notification.created /
  // notification.updated events to invalidate this query. We still refetch
  // on window focus as a belt-and-braces safety net for missed events
  // (e.g. brief socket disconnect during a deploy).
  return useQuery<{ count: number }>({
    queryKey: COUNT_KEY,
    queryFn: ({ signal }) => apiFetch<{ count: number }>('/notifications/unread-count', { signal }),
    refetchOnWindowFocus: true,
    staleTime: 30_000,
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

export type NotificationReply = {
  id: string
  notificationId: string
  body: string
  createdAt: string
  author: { id: string; name: string | null; email: string }
}

const REPLIES_KEY = (notificationId: string) =>
  ['notifications', 'replies', notificationId] as const

/// Reply thread for a single notification. Server enforces participation —
/// non-participants get 403 and react-query stores it as an error. The UI
/// keeps the thread closed in that case (the bell row only opens on click,
/// which we gate on participant status client-side too).
export function useNotificationReplies(
  notificationId: string | null,
  opts?: { enabled?: boolean },
) {
  return useQuery<{ replies: NotificationReply[] }>({
    queryKey: notificationId ? REPLIES_KEY(notificationId) : ['notifications', 'replies', 'none'],
    queryFn: ({ signal }) =>
      apiFetch<{ replies: NotificationReply[] }>(`/notifications/${notificationId}/replies`, {
        signal,
      }),
    enabled: Boolean(notificationId) && (opts?.enabled ?? true),
    staleTime: 10_000,
  })
}

export function useComposeReply() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: { notificationId: string; body: string }) => {
      return apiPost<{ reply: NotificationReply }>(
        `/notifications/${input.notificationId}/replies`,
        { body: input.body },
      )
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: REPLIES_KEY(vars.notificationId) })
    },
  })
}
