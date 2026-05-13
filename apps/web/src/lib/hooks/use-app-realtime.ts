'use client'

import { useQueryClient } from '@tanstack/react-query'
import { useEffect } from 'react'
import { toast } from 'sonner'
import { acquireSocket, releaseSocket } from '@/lib/realtime-socket'

type ChatConversationUpsertedPayload = {
  id: string
  venueId: string
  channel: string
}

type WhatsappInviteUpdatedPayload = {
  id: string
  status: 'redeemed' | 'revoked' | 'exhausted' | 'expired'
}

type PhoneStatusChangedPayload = {
  phoneNumber: string
  phoneVerifiedAt: string
}

// Cross-domain realtime invalidations. Mounted once at the shell level so
// every page benefits — sidebar conversation list, settings/phone, and
// org/invites all stay in sync without per-page polling.
export function useAppRealtime(): void {
  const qc = useQueryClient()

  useEffect(() => {
    const socket = acquireSocket()

    const handleConvUpserted = (_payload: ChatConversationUpsertedPayload) => {
      qc.invalidateQueries({ queryKey: ['chat-conversations'] })
    }

    const handleInviteUpdated = (payload: WhatsappInviteUpdatedPayload) => {
      qc.invalidateQueries({ queryKey: ['whatsapp-invites'] })
      if (payload.status === 'redeemed') {
        toast.success('A WhatsApp invite was just redeemed')
      }
    }

    const handlePhoneChanged = (_payload: PhoneStatusChangedPayload) => {
      qc.invalidateQueries({ queryKey: ['phone', 'status'] })
      toast.success('Phone number verified')
    }

    socket.on('chat.conversation.upserted', handleConvUpserted)
    socket.on('whatsapp.invite.updated', handleInviteUpdated)
    socket.on('phone.status.changed', handlePhoneChanged)

    return () => {
      socket.off('chat.conversation.upserted', handleConvUpserted)
      socket.off('whatsapp.invite.updated', handleInviteUpdated)
      socket.off('phone.status.changed', handlePhoneChanged)
      releaseSocket()
    }
  }, [qc])
}
