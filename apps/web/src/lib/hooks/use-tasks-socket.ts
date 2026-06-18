'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { acquireSocket, releaseSocket } from '@/lib/realtime-socket'

type TaskUpsertedPayload = {
  kind: 'created' | 'updated'
  id: string
  assigneeUserId: string
  status: string
  dueAt: string | null
  remindedAt: string | null
}

type TaskDeletedPayload = {
  id: string
}

export function useTasksSocket(opts?: {
  onUpserted?: (payload: TaskUpsertedPayload) => void
  onDeleted?: (payload: TaskDeletedPayload) => void
}): void {
  const queryClient = useQueryClient()
  const onUpserted = opts?.onUpserted
  const onDeleted = opts?.onDeleted

  useEffect(() => {
    const socket = acquireSocket()

    const handleUpserted = (payload: TaskUpsertedPayload) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      onUpserted?.(payload)
    }
    const handleDeleted = (payload: TaskDeletedPayload) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      onDeleted?.(payload)
    }

    socket.on('task.upserted', handleUpserted)
    socket.on('task.deleted', handleDeleted)

    return () => {
      socket.off('task.upserted', handleUpserted)
      socket.off('task.deleted', handleDeleted)
      releaseSocket()
    }
  }, [queryClient, onUpserted, onDeleted])
}
