'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { acquireSocket, releaseSocket } from '@/lib/realtime-socket'

type ExpiryUpsertedPayload = {
  kind: 'created' | 'updated'
  id: string
  status: string
  expiresAt: string
  category: string
}

export function useComplianceSocket(opts?: {
  onUpserted?: (payload: ExpiryUpsertedPayload) => void
}): void {
  const queryClient = useQueryClient()
  const onUpserted = opts?.onUpserted

  useEffect(() => {
    const socket = acquireSocket()
    const handle = (payload: ExpiryUpsertedPayload) => {
      queryClient.invalidateQueries({ queryKey: ['compliance'] })
      onUpserted?.(payload)
    }
    socket.on('expiry.upserted', handle)
    return () => {
      socket.off('expiry.upserted', handle)
      releaseSocket()
    }
  }, [queryClient, onUpserted])
}
