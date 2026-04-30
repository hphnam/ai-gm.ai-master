'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io, type Socket } from 'socket.io-client'
import { API_URL } from '@/lib/api-client'

type DocUpdatedPayload = { id: string; status: string }
type GapUpdatedPayload = { id: string; status: 'created' | 'answered' | 'deleted' }

// Single shared socket per session. Multiple components mounting the hook
// share one connection; the connection is torn down only when nothing is
// listening (effectively, when the app unmounts).
let sharedSocket: Socket | null = null
let listenerCount = 0

function getSocket(): Socket {
  if (sharedSocket && sharedSocket.connected) return sharedSocket
  if (sharedSocket) return sharedSocket

  sharedSocket = io(API_URL, {
    withCredentials: true,
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1_000,
    reconnectionDelayMax: 10_000,
  })
  return sharedSocket
}

export function useKbSocket(): void {
  const queryClient = useQueryClient()

  useEffect(() => {
    const socket = getSocket()
    listenerCount += 1

    const handleDoc = (payload: DocUpdatedPayload) => {
      // Lightweight invalidation — refetch the list and the single doc cache.
      queryClient.invalidateQueries({ queryKey: ['docs'] })
      if (payload.id) {
        queryClient.invalidateQueries({ queryKey: ['docs', payload.id] })
      }
    }

    const handleGap = (_payload: GapUpdatedPayload) => {
      queryClient.invalidateQueries({ queryKey: ['docs', 'gaps'] })
    }

    const handleUnauthorized = () => {
      // The server kicked us — likely no session. Don't auto-reconnect on this.
      socket.disconnect()
    }

    socket.on('doc.updated', handleDoc)
    socket.on('gap.updated', handleGap)
    socket.on('unauthorized', handleUnauthorized)

    return () => {
      socket.off('doc.updated', handleDoc)
      socket.off('gap.updated', handleGap)
      socket.off('unauthorized', handleUnauthorized)
      listenerCount -= 1
      if (listenerCount <= 0) {
        listenerCount = 0
        socket.disconnect()
        sharedSocket = null
      }
    }
  }, [queryClient])
}
