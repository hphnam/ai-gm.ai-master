'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'
import { orgMembersQuery } from '@/lib/queries/keys'

// Mirrors apps/api/src/modules/invitations/dto/invitations.dto.ts OrgMemberSchema.
// Once `npm run api:generate` runs, swap to the orval-generated type.
export type OrgMember = {
  userId: string
  name: string | null
  // Null for phone-only members — show phoneNumber instead of the synthetic
  // placeholder email the backend suppresses.
  email: string | null
  phoneNumber: string | null
  role: string
  // Empty = access to all venues; non-empty = restricted to these venue ids.
  venueIds: string[]
  isSelf: boolean
  joinedAt: string
}

export type ListOrgMembersResponse = {
  members: OrgMember[]
}

export function useOrgMembers() {
  return useQuery<ListOrgMembersResponse>({
    queryKey: orgMembersQuery.queryKey,
    queryFn: ({ signal }) => apiFetch<ListOrgMembersResponse>(orgMembersQuery.path, { signal }),
    // Members rarely change within a session; keep the result fresh for a
    // minute so navigating Settings → Knowledge → back doesn't re-fetch.
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
}

export function useRemoveOrgMember() {
  const queryClient = useQueryClient()
  return useMutation<{ ok: true; deletedUser: boolean }, Error, string>({
    mutationFn: (userId) =>
      apiFetch<{ ok: true; deletedUser: boolean }>(`/org/members/${userId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members'] })
    },
  })
}

// Set a member's venue scope. Empty array = all venues. Server drops unknown ids
// and returns the effective set.
export function useUpdateMemberVenues() {
  const queryClient = useQueryClient()
  return useMutation<
    { ok: true; venueIds: string[] },
    Error,
    { userId: string; venueIds: string[] }
  >({
    mutationFn: ({ userId, venueIds }) =>
      apiFetch<{ ok: true; venueIds: string[] }>(`/org/members/${userId}/venues`, {
        method: 'PATCH',
        body: JSON.stringify({ venueIds }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['org-members'] })
    },
  })
}
