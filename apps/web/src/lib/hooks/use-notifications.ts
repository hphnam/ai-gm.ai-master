'use client'

import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { ApiError, apiFetch, apiPost } from '@/lib/api-client'

export type NotificationSource = 'chat' | 'whatsapp' | 'manual'
export type NotificationStatus = 'unread' | 'read'
export type NotificationCategory = 'chat' | 'report' | 'compliance' | 'task' | 'system'
export type NotificationDirection = 'inbox' | 'sent'

export type NotificationParty = { id: string; name: string | null; email: string }

export type NotificationReference = { kind: string; id: string } | null

export type Notification = {
  id: string
  body: string
  source: NotificationSource
  category: NotificationCategory
  // True for background-job-composed rows (task reminders, scheduled report
  // ready). Drives the gm assistant treatment in the row UI; `author` is
  // still surfaced as secondary context.
  automated: boolean
  // Loose pointer to the entity this notification is about — drives the
  // "Open task" / "Mark complete" action buttons on the alerts row.
  reference: NotificationReference
  status: NotificationStatus
  createdAt: string
  readAt: string | null
  author: NotificationParty | null
  recipient: NotificationParty
}

export type ListNotificationsResponse = {
  notifications: Notification[]
  unreadCount: number
  nextCursor: string | null
  hasMore: boolean
}

export type NotificationListFilters = {
  status?: 'unread' | 'read' | 'all'
  direction?: NotificationDirection
  q?: string
  category?: NotificationCategory[]
  pageSize?: number
}

export type Recipient = {
  userId: string
  name: string | null
  email: string
  role: string
}

const LIST_PREFIX = ['notifications', 'list'] as const
const COUNT_KEY = ['notifications', 'unread-count'] as const
const RECIPIENTS_KEY = ['notifications', 'recipients'] as const

// Stable key includes the filter fingerprint so React Query keeps per-filter
// caches separate. Socket invalidation uses LIST_PREFIX so it busts every
// variant in one shot — cheap and correct.
function listKey(filters: NotificationListFilters) {
  return [
    ...LIST_PREFIX,
    {
      status: filters.status ?? 'all',
      direction: filters.direction ?? 'inbox',
      q: filters.q ?? '',
      // Sort categories so [a,b] and [b,a] hit the same cache entry.
      category: [...(filters.category ?? [])].sort().join(','),
      pageSize: filters.pageSize ?? 30,
    },
  ] as const
}

const DEFAULT_PAGE_SIZE = 30

export function useInfiniteNotifications(filters: NotificationListFilters = {}) {
  const pageSize = filters.pageSize ?? DEFAULT_PAGE_SIZE
  const qc = useQueryClient()
  const key = listKey(filters)
  return useInfiniteQuery<
    ListNotificationsResponse,
    Error,
    InfiniteData<ListNotificationsResponse>
  >({
    queryKey: key,
    // Initial page has no cursor; pageParam stays string after first fetch.
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) => {
      const params = new URLSearchParams()
      params.set('limit', String(pageSize))
      if (filters.status && filters.status !== 'all') params.set('status', filters.status)
      if (filters.direction && filters.direction !== 'inbox') {
        params.set('direction', filters.direction)
      }
      if (filters.q?.trim()) params.set('q', filters.q.trim())
      if (filters.category && filters.category.length > 0) {
        params.set('category', filters.category.join(','))
      }
      if (pageParam) params.set('cursor', pageParam as string)
      try {
        return await apiFetch<ListNotificationsResponse>(`/notifications?${params.toString()}`, {
          signal,
        })
      } catch (err) {
        // The server returns 400 invalid-cursor when the cursor decodes badly
        // (typically after a deploy that changes the cursor format, or a
        // tampered cursor). Recover by dropping this cache entry — the next
        // mount will re-fetch from the top.
        if (
          err instanceof ApiError &&
          err.status === 400 &&
          String(err.code) === 'invalid-cursor'
        ) {
          qc.removeQueries({ queryKey: key })
        }
        throw err
      }
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
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
      qc.invalidateQueries({ queryKey: LIST_PREFIX })
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
      qc.invalidateQueries({ queryKey: LIST_PREFIX })
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
      // Refresh list caches (Sent view picks up the new row). Don't touch
      // COUNT_KEY — unread is recipient-side state; sending never changes
      // the author's own bell badge. Matches the socket handler's policy.
      qc.invalidateQueries({ queryKey: LIST_PREFIX })
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
/// non-participants get 404 and react-query stores it as an error. The UI
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
