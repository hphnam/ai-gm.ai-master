'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { apiFetch } from '@/lib/api-client'
import { mapApiError } from '@/lib/map-api-error'
import { orgProfileQuery } from '@/lib/queries/keys'

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
    queryKey: orgProfileQuery.queryKey,
    queryFn: () => apiFetch<OrgProfileResponse>(orgProfileQuery.path),
    refetchOnWindowFocus: false,
    retry: false,
  })
}

export function useUpdateOrgProfile(opts?: { silent?: boolean }) {
  const queryClient = useQueryClient()
  const silent = opts?.silent ?? false
  return useMutation<OrgProfileResponse, Error, OrganizationProfile>({
    mutationFn: (body) =>
      apiFetch<OrgProfileResponse>('/org/profile', {
        method: 'PUT',
        body: JSON.stringify(body),
      }),
    onSuccess: (res) => {
      queryClient.setQueryData(orgProfileQuery.queryKey, res)
      if (!silent) toast.success('Business profile saved')
    },
    onError: (err) => {
      if (!silent) toast.error(mapApiError(err))
    },
  })
}

export function useGenerateOrgDescription() {
  return useMutation<{ description: string }, Error>({
    mutationFn: () =>
      apiFetch<{ description: string }>('/org/profile/describe', { method: 'POST' }),
    onError: (err) => toast.error(mapApiError(err)),
  })
}
