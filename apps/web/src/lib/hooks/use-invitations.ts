'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
  AcceptInvitationResponseDto as AcceptInvitationResponse,
  CreateInvitationResponseDto as CreateInvitationResponse,
  InvitationPreviewDto as InvitationPreview,
  InviteBodyDto as InviteBody,
  ListInvitationsResponseDto as ListInvitationsResponse,
} from '@/generated/api'
import { type ApiError, apiFetch, apiPost } from '@/lib/api-client'
import { mapApiError } from '@/lib/map-api-error'
import { invitationsQuery } from '@/lib/queries/keys'

export function useInvitations() {
  return useQuery<ListInvitationsResponse>({
    queryKey: invitationsQuery.queryKey,
    queryFn: () => apiFetch<ListInvitationsResponse>(invitationsQuery.path),
    refetchOnWindowFocus: false,
    retry: false,
  })
}

export function useCreateInvitation() {
  const queryClient = useQueryClient()
  return useMutation<CreateInvitationResponse, Error, InviteBody>({
    mutationFn: (body) => apiPost<CreateInvitationResponse>('/org/invitations', body),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
      if (res.warning === 'mail-send-failed') {
        toast.warning("Saved the invitation but couldn't send the email. Copy the link manually.")
      } else if (res.reissued) {
        toast.info('Invitation already pending — re-sent the existing link.')
      } else {
        toast.success(`Invitation sent to ${res.invitation.email}`)
      }
    },
    onError: (err) => toast.error(mapApiError(err)),
  })
}

export type InviteChannel = 'email' | 'phone'

export type BatchInviteRow = {
  channel: InviteChannel
  // Email address, or an E.164-normalised phone number depending on `channel`.
  value: string
  role: 'manager' | 'staff'
  venueIds: string[]
}

export type BatchInviteResult = {
  index: number
  ok: boolean
  error?: string
  // Fulfilled email invites can still carry the single-invite path's signals:
  // the row was saved but the email didn't send, or it re-sent an existing one.
  warning?: 'mail-send-failed'
  reissued?: boolean
}

// Sends every row independently to its channel's endpoint and reports a
// per-row outcome so the form can keep only the rows that failed. One shared
// invalidation of both invite lists at the end; no per-row toasts (the caller
// shows a single summary).
export function useBatchInvite() {
  const queryClient = useQueryClient()
  return useMutation<BatchInviteResult[], Error, BatchInviteRow[]>({
    mutationFn: async (rows) => {
      const settled = await Promise.allSettled(
        rows.map((row) =>
          row.channel === 'email'
            ? apiPost<CreateInvitationResponse>('/org/invitations', {
                email: row.value,
                role: row.role,
                venueIds: row.venueIds,
              })
            : apiPost('/whatsapp/invites', {
                phoneNumber: row.value,
                role: row.role,
                venueIds: row.venueIds,
              }),
        ),
      )
      return settled.map((res, index): BatchInviteResult => {
        if (res.status !== 'fulfilled') {
          return { index, ok: false, error: mapApiError(res.reason) }
        }
        const email = res.value as Partial<CreateInvitationResponse>
        return {
          index,
          ok: true,
          warning: email.warning === 'mail-send-failed' ? 'mail-send-failed' : undefined,
          reissued: email.reissued ?? undefined,
        }
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
      queryClient.invalidateQueries({ queryKey: ['whatsapp-invites'] })
    },
  })
}

export function useRevokeInvitation() {
  const queryClient = useQueryClient()
  return useMutation<{ ok: true }, Error, string>({
    mutationFn: (id) => apiFetch<{ ok: true }>(`/org/invitations/${id}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
      toast.success('Invitation revoked')
    },
    onError: (err) => toast.error(mapApiError(err)),
  })
}

export function useInvitationPreview(id: string | undefined) {
  return useQuery<InvitationPreview, ApiError>({
    queryKey: ['invitation-preview', id],
    queryFn: () => apiFetch<InvitationPreview>(`/org/invitations/${id}/preview`),
    enabled: !!id,
    refetchOnWindowFocus: false,
    retry: false,
  })
}

export function useAcceptInvitation() {
  const queryClient = useQueryClient()
  return useMutation<AcceptInvitationResponse, Error, string>({
    mutationFn: (id) => apiPost<AcceptInvitationResponse>(`/org/invitations/${id}/accept`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invitations'] })
      queryClient.invalidateQueries({ queryKey: ['venues'] })
      queryClient.invalidateQueries({ queryKey: ['session'] })
    },
    // Intentionally no onError toast — caller renders classified message via mapApiError
  })
}
