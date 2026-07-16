'use client'

import { authClient } from '@/lib/auth-client'

export type MemberRole = 'staff' | 'manager' | 'owner'

// Role rides on the better-auth session (customSession plugin), so this reads
// from useSession() — no dedicated role request, available to every member.
export function useCurrentMember(): {
  role: MemberRole | null
  isOwner: boolean
  isManager: boolean
  isStaff: boolean
  isLoading: boolean
} {
  const { data, isPending } = authClient.useSession()
  const role =
    ((data as { membership?: { role?: string } } | null)?.membership?.role as
      | MemberRole
      | undefined) ?? null
  return {
    role,
    isOwner: role === 'owner',
    // isManager stays true for owners too — it's the "sees manager-tier data"
    // gate. Use isOwner for the group/all-venues variant specifically.
    isManager: role === 'manager' || role === 'owner',
    isStaff: role === 'staff',
    isLoading: isPending,
  }
}
