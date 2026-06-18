'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { acquireSocket, releaseSocket } from '@/lib/realtime-socket'

type DocUpdatedPayload = { id: string; status: string }
type GapUpdatedPayload = { id: string; status: 'created' | 'answered' | 'deleted' }

export function useKbSocket(): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    const socket = acquireSocket()

    const handleDoc = (payload: DocUpdatedPayload) => {
      queryClient.invalidateQueries({ queryKey: ['docs'] })
      if (payload.id) {
        queryClient.invalidateQueries({ queryKey: ['docs', payload.id] })
      }
    }

    const handleGap = (_payload: GapUpdatedPayload) => {
      queryClient.invalidateQueries({ queryKey: ['docs', 'gaps'] })
    }

    const handleUnauthorized = () => {
      socket.disconnect()
    }

    socket.on('doc.updated', handleDoc)
    socket.on('gap.updated', handleGap)
    socket.on('unauthorized', handleUnauthorized)

    return () => {
      socket.off('doc.updated', handleDoc)
      socket.off('gap.updated', handleGap)
      socket.off('unauthorized', handleUnauthorized)
      releaseSocket()
    }
  }, [queryClient])
}
