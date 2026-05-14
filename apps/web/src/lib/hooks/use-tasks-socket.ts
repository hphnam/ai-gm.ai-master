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

export function useTasksSocket(opts?: {
  onUpserted?: (payload: TaskUpsertedPayload) => void
}): void {
  const queryClient = useQueryClient()
  const onUpserted = opts?.onUpserted

  useEffect(() => {
    const socket = acquireSocket()

    const handleUpserted = (payload: TaskUpsertedPayload) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      onUpserted?.(payload)
    }

    socket.on('task.upserted', handleUpserted)

    return () => {
      socket.off('task.upserted', handleUpserted)
      releaseSocket()
    }
  }, [queryClient, onUpserted])
}
