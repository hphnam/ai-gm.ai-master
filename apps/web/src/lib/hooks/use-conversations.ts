'use client'

import {
  type InfiniteData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query'
import { ApiError, apiFetch, apiPost } from '@/lib/api-client'

export type ConversationParty = { id: string; name: string | null; email: string }

export type ConversationSummary = {
  otherParty: ConversationParty
  latestPreview: string
  latestAt: string
  latestFromMe: boolean
  latestViaAi: boolean
  unreadCount: number
}

export type ConversationMessage = {
  id: string
  kind: 'note' | 'reply'
  body: string
  sentAt: string
  fromMe: boolean
  author: ConversationParty | null
  viaAi: boolean
  status: 'unread' | 'read'
  canDeleteForAll: boolean
}

export type DeleteMessageScope = 'self' | 'all'

export type ListConversationMessagesResponse = {
  messages: ConversationMessage[]
  otherParty: ConversationParty
  nextCursor: string | null
  hasMore: boolean
}

const CONVERSATIONS_LIST_KEY = ['conversations', 'list'] as const
const CONVERSATION_MESSAGES_KEY = (otherUserId: string) =>
  ['conversations', 'messages', otherUserId] as const

export function useConversations() {
  return useQuery<{ conversations: ConversationSummary[] }>({
    queryKey: CONVERSATIONS_LIST_KEY,
    queryFn: ({ signal }) =>
      apiFetch<{ conversations: ConversationSummary[] }>('/notifications/conversations', {
        signal,
      }),
    staleTime: 15_000,
  })
}

const PAGE_SIZE = 50

export function useConversationMessages(otherUserId: string | null) {
  const qc = useQueryClient()
  return useInfiniteQuery<
    ListConversationMessagesResponse,
    Error,
    InfiniteData<ListConversationMessagesResponse>
  >({
    queryKey: otherUserId ? CONVERSATION_MESSAGES_KEY(otherUserId) : ['conversations', 'none'],
    initialPageParam: undefined as string | undefined,
    queryFn: async ({ pageParam, signal }) => {
      if (!otherUserId) {
        throw new Error('conversation id missing')
      }
      const params = new URLSearchParams()
      params.set('limit', String(PAGE_SIZE))
      if (pageParam) params.set('cursor', pageParam as string)
      try {
        return await apiFetch<ListConversationMessagesResponse>(
          `/notifications/conversations/${encodeURIComponent(otherUserId)}/messages?${params.toString()}`,
          { signal },
        )
      } catch (err) {
        // Stale cursor on a deploy that rotates encoding → drop cache + restart
        // from latest. Same pattern as the inbox list endpoint.
        if (
          err instanceof ApiError &&
          err.status === 400 &&
          String(err.code) === 'invalid-cursor'
        ) {
          qc.removeQueries({ queryKey: CONVERSATION_MESSAGES_KEY(otherUserId) })
        }
        throw err
      }
    },
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    enabled: Boolean(otherUserId),
    staleTime: 10_000,
  })
}

export function useSendMessage(otherUserId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (body: string) => {
      if (!otherUserId) throw new Error('conversation id missing')
      return apiPost<{ message: ConversationMessage }>(
        `/notifications/conversations/${encodeURIComponent(otherUserId)}/messages`,
        { body },
      )
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONVERSATIONS_LIST_KEY })
      if (otherUserId) {
        qc.invalidateQueries({ queryKey: CONVERSATION_MESSAGES_KEY(otherUserId) })
      }
      // Touch the inbox list cache so any open Sent/Inbox views also refresh
      // — chat messages are stored as notifications under the hood.
      qc.invalidateQueries({ queryKey: ['notifications', 'list'] })
    },
  })
}

export function useMarkConversationRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (otherUserId: string) => {
      return apiPost<{ updated: number }>(
        `/notifications/conversations/${encodeURIComponent(otherUserId)}/read`,
        {},
      )
    },
    onSuccess: (res) => {
      // Only refresh badge state if the server actually marked rows read —
      // avoids a wasted refetch when the user opens an already-clean thread.
      if (res.updated > 0) {
        qc.invalidateQueries({ queryKey: CONVERSATIONS_LIST_KEY })
        qc.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
        qc.invalidateQueries({ queryKey: ['notifications', 'list'] })
      }
    },
  })
}

export function useDeleteConversation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (otherUserId: string) => {
      // DELETE /notifications/conversations/:otherUserId — returns 204
      return apiFetch<void>(`/notifications/conversations/${encodeURIComponent(otherUserId)}`, {
        method: 'DELETE',
      })
    },
    onSuccess: (_res, otherUserId) => {
      qc.invalidateQueries({ queryKey: CONVERSATIONS_LIST_KEY })
      qc.removeQueries({ queryKey: CONVERSATION_MESSAGES_KEY(otherUserId) })
    },
  })
}

export function useDeleteMessage(otherUserId: string | null) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      kind: 'note' | 'reply'
      messageId: string
      scope: DeleteMessageScope
    }) => {
      if (!otherUserId) throw new Error('conversation id missing')
      const url =
        `/notifications/conversations/${encodeURIComponent(otherUserId)}` +
        `/messages/${input.kind}/${encodeURIComponent(input.messageId)}` +
        `?scope=${input.scope}`
      return apiFetch<void>(url, { method: 'DELETE' })
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: CONVERSATIONS_LIST_KEY })
      if (otherUserId) {
        qc.invalidateQueries({ queryKey: CONVERSATION_MESSAGES_KEY(otherUserId) })
      }
      qc.invalidateQueries({ queryKey: ['notifications', 'list'] })
    },
  })
}

export { CONVERSATION_MESSAGES_KEY, CONVERSATIONS_LIST_KEY }
