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

export function useInvitations() {
  return useQuery<ListInvitationsResponse>({
    queryKey: ['invitations'],
    queryFn: () => apiFetch<ListInvitationsResponse>('/org/invitations'),
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
