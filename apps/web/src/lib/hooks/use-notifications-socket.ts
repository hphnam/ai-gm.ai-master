'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { acquireSocket, releaseSocket } from '@/lib/realtime-socket'

type NotificationCreatedPayload = {
  id: string
  body: string
  source: 'chat' | 'whatsapp' | 'manual'
  createdAt: string
  author: { id: string; name: string | null; email: string } | null
}

type NotificationUpdatedPayload =
  | { kind: 'read'; id: string; readAt: string }
  | { kind: 'all-read'; readAt: string }

type NotificationReplyPayload = {
  notificationId: string
  reply: {
    id: string
    body: string
    createdAt: string
    author: { id: string; name: string | null; email: string }
  }
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
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
      onCreated?.(payload)
    }

    const handleUpdated = (_payload: NotificationUpdatedPayload) => {
      queryClient.invalidateQueries({ queryKey: ['notifications', 'list'] })
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread-count'] })
    }

    const handleReply = (payload: NotificationReplyPayload) => {
      queryClient.invalidateQueries({
        queryKey: ['notifications', 'replies', payload.notificationId],
      })
    }

    socket.on('notification.created', handleCreated)
    socket.on('notification.updated', handleUpdated)
    socket.on('notification.reply.created', handleReply)

    return () => {
      socket.off('notification.created', handleCreated)
      socket.off('notification.updated', handleUpdated)
      socket.off('notification.reply.created', handleReply)
      releaseSocket()
    }
  }, [queryClient, onCreated])
}
