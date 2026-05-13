'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import type {
  PhoneStatusResponseDto as PhoneStatusResponse,
  SendPhoneCodeBodyDto as SendPhoneCodeBody,
  SendPhoneCodeResponseDto as SendPhoneCodeResponse,
  VerifyPhoneCodeBodyDto as VerifyPhoneCodeBody,
  VerifyPhoneCodeResponseDto as VerifyPhoneCodeResponse,
} from '@/generated/api'
import { apiFetch, apiPost } from '@/lib/api-client'
import { mapApiError } from '@/lib/map-api-error'

export function usePhoneStatus() {
  return useQuery<PhoneStatusResponse>({
    queryKey: ['phone', 'status'],
    queryFn: () => apiFetch<PhoneStatusResponse>('/auth/phone/status'),
    refetchOnWindowFocus: false,
    retry: false,
  })
}

export function useSendPhoneCode() {
  return useMutation<SendPhoneCodeResponse, Error, SendPhoneCodeBody>({
    mutationFn: (body) => apiPost<SendPhoneCodeResponse>('/auth/phone/send', body),
    onError: (err) => toast.error(mapApiError(err)),
  })
}

export function useVerifyPhoneCode() {
  const queryClient = useQueryClient()
  return useMutation<VerifyPhoneCodeResponse, Error, VerifyPhoneCodeBody>({
    mutationFn: (body) => apiPost<VerifyPhoneCodeResponse>('/auth/phone/verify', body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phone', 'status'] })
      toast.success('Phone number verified')
    },
    onError: (err) => toast.error(mapApiError(err)),
  })
}

export function useUnlinkPhone() {
  const queryClient = useQueryClient()
  return useMutation<{ ok: true }, Error, void>({
    mutationFn: () => apiFetch<{ ok: true }>('/auth/phone', { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phone', 'status'] })
      toast.success('Phone number unlinked')
    },
    onError: (err) => toast.error(mapApiError(err)),
  })
}
