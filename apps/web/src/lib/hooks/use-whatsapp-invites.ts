'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch, apiPost } from '@/lib/api-client'
import { mapApiError } from '@/lib/map-api-error'

// ─── Types ──────────────────────────────────────────────────────────────
// Mirrored from apps/api/src/types/whatsapp-invite.ts. Kept inline because
// orval generates `data: void` for these endpoints (untyped response surface).

export type WhatsappInviteRole = 'staff' | 'manager'

export type WhatsappInviteStatus = 'pending' | 'redeemed' | 'revoked' | 'exhausted' | 'expired'

export type CreateWhatsappInviteInput = {
  phoneNumber: string
  role: WhatsappInviteRole
  note?: string
}

export type WhatsappInvitePublic = {
  id: string
  phoneNumberMasked: string
  role: WhatsappInviteRole
  note: string | null
  expiresAt: string
  status: WhatsappInviteStatus
  createdAt: string
}

export type CreateWhatsappInviteResponse = {
  invite: WhatsappInvitePublic & { code: string }
  oneTimeDisplay: true
}

export type ListWhatsappInvitesResponse = {
  invites: WhatsappInvitePublic[]
}

const QUERY_KEY = ['whatsapp-invites'] as const

// ─── Hooks ──────────────────────────────────────────────────────────────

export function useWhatsappInvites() {
  return useQuery<ListWhatsappInvitesResponse>({
    queryKey: QUERY_KEY,
    queryFn: () => apiFetch<ListWhatsappInvitesResponse>('/whatsapp/invites'),
    refetchOnWindowFocus: false,
    retry: false,
  })
}

export function useCreateWhatsappInvite() {
  const queryClient = useQueryClient()
  return useMutation<
    CreateWhatsappInviteResponse,
    Error,
    { input: CreateWhatsappInviteInput; force?: boolean }
  >({
    mutationFn: ({ input, force }) =>
      apiPost<CreateWhatsappInviteResponse>(
        force ? '/whatsapp/invites?force=true' : '/whatsapp/invites',
        input,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
    },
    // Caller surfaces errors — code is shown inline in the dialog post-success,
    // so we don't toast on success. Errors map via mapApiError in the dialog.
  })
}

export function useRevokeWhatsappInvite() {
  const queryClient = useQueryClient()
  return useMutation<void, Error, string>({
    mutationFn: (id) => apiFetch<void>(`/whatsapp/invites/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEY })
      toast.success('WhatsApp invite revoked')
    },
    onError: (err) => toast.error(mapApiError(err)),
  })
}
