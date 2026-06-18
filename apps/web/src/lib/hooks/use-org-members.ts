'use client'

import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/api-client'

// Mirrors apps/api/src/modules/invitations/dto/invitations.dto.ts OrgMemberSchema.
// Once `npm run api:generate` runs, swap to the orval-generated type.
export type OrgMember = {
  userId: string
  name: string | null
  email: string
  role: string
  isSelf: boolean
  joinedAt: string
}

export type ListOrgMembersResponse = {
  members: OrgMember[]
}

export function useOrgMembers() {
  return useQuery<ListOrgMembersResponse>({
    queryKey: ['org-members'],
    queryFn: ({ signal }) => apiFetch<ListOrgMembersResponse>('/org/members', { signal }),
    // Members rarely change within a session; keep the result fresh for a
    // minute so navigating Settings → Knowledge → back doesn't re-fetch.
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  })
}
