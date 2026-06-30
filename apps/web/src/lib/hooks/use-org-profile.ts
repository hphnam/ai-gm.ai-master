'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api-client'
import { mapApiError } from '@/lib/map-api-error'

export interface OrganizationProfile {
  businessType?: string
  description?: string
  goals?: string[]
  constraints?: string
  country?: string
  currency?: string
}

interface OrgProfileResponse {
  profile: OrganizationProfile
}

export function useOrgProfile() {
  return useQuery<OrgProfileResponse>({
    queryKey: ['org-profile'],
    queryFn: () => apiFetch<OrgProfileResponse>('/org/profile'),
    refetchOnWindowFocus: false,
    retry: false,
  })
}

export function useUpdateOrgProfile() {
  const queryClient = useQueryClient()
  return useMutation<OrgProfileResponse, Error, OrganizationProfile>({
    mutationFn: (body) =>
      apiFetch<OrgProfileResponse>('/org/profile', {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: (res) => {
      queryClient.setQueryData(['org-profile'], res)
      toast.success('Business profile saved')
    },
    onError: (err) => toast.error(mapApiError(err)),
  })
}
