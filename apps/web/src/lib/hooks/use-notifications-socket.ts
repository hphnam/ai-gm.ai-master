'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { acquireSocket, releaseSocket } from '@/lib/realtime-socket'

type NotificationCreatedPayload = {
  // 'received'           — you're the recipient; toast + bell badge tick.
  // 'sent-confirmation'  — you authored this; silent refresh for any open
  //                        Sent view in this or another tab. No toast.
  kind: 'received' | 'sent-confirmation'
  id: string
  body: string
  source: 'chat' | 'whatsapp' | 'manual'
  category: 'chat' | 'report' | 'compliance' | 'task' | 'system'
  automated: boolean
  reference: { kind: string; id: string } | null
  createdAt: string
  author: { id: string; name: string | null; email: string } | null
  recipient: { id: string; name: string | null; email: string }
}

type NotificationUpdatedPayload =
  | { kind: 'read'; id: string; readAt: string }
  | { kind: 'all-read'; readAt: string }

type NotificationReplyPayload = {
  notificationId: string
  // The non-self participant in the parent thread. Null only for system-
  // authored parents (compliance, reports), where replies aren't possible
  // — but the field stays nullable for type-system safety.
  otherUserId: string | null
  reply: {
    id: string
    body: string
    createdAt: string
    author: { id: string; name: string | null; email: string }
  }
}

type NotificationDeletedPayload = {
  kind: 'note' | 'reply'
  messageId: string
  otherUserId: string | null
}

export function useNotificationsSocket(opts: {
  onCreated?: (payload: NotificationCreatedPayload) => void
}): void {
  const queryClient = useQueryClient()
  const onCreated = opts.onCreated

  useEffect(() => {
    const socket = acquireSocket()

    const handleCreated = (payload: NotificationCreatedPayload) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] })
      // Chat-category notifications drive the Conversations surface. Bust
      // the list and the specific conversation's message history. The
      // "other party" is whoever isn't the local user — for `received`
      // that's the author; for `sent-confirmation` that's the recipient.
      if (payload.category === 'chat') {
        queryClient.invalidateQueries({ queryKey: ['conversations', 'list'] })
        const otherUserId = payload.kind === 'received' ? payload.author?.id : payload.recipient.id
        if (otherUserId) {
          queryClient.invalidateQueries({
            queryKey: ['conversations', 'messages', otherUserId],
          })
        }
      }
      if (payload.kind === 'received') {
        queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
      }
      if (payload.kind === 'received') {
        onCreated?.(payload)
      }
    }

    const handleUpdated = (_payload: NotificationUpdatedPayload) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
      // Mark-read affects per-conversation badges too.
      queryClient.invalidateQueries({ queryKey: ['conversations', 'list'] })
    }

    const handleReply = (payload: NotificationReplyPayload) => {
      queryClient.invalidateQueries({
        queryKey: ['notifications', 'replies', payload.notificationId],
      })
      // Replies are part of the conversation's unified message stream — bust
      // the conversation cache so the new bubble appears for the recipient.
      if (payload.otherUserId) {
        queryClient.invalidateQueries({
          queryKey: ['conversations', 'messages', payload.otherUserId],
        })
        queryClient.invalidateQueries({ queryKey: ['conversations', 'list'] })
      }
    }

    const handleDeleted = (payload: NotificationDeletedPayload) => {
      // A message was hard-deleted ("delete for everyone") by the author.
      // Bust both the conversation message cache (so the bubble disappears)
      // and the conversation list (in case the latest preview changes).
      if (payload.otherUserId) {
        queryClient.invalidateQueries({
          queryKey: ['conversations', 'messages', payload.otherUserId],
        })
      }
      queryClient.invalidateQueries({ queryKey: ['conversations', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    }

    socket.on('notification.created', handleCreated)
    socket.on('notification.updated', handleUpdated)
    socket.on('notification.reply.created', handleReply)
    socket.on('notification.deleted', handleDeleted)

    return () => {
      socket.off('notification.created', handleCreated)
      socket.off('notification.updated', handleUpdated)
      socket.off('notification.reply.created', handleReply)
      socket.off('notification.deleted', handleDeleted)
      releaseSocket()
    }
  }, [queryClient, onCreated])
}
