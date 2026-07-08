'use client'

import { authClient } from '@/lib/auth-client'

export type MemberRole = 'staff' | 'manager' | 'owner'

// Role rides on the better-auth session (customSession plugin), so this reads
// from useSession() — no dedicated role request, available to every member.
export function useCurrentMember(): {
  role: MemberRole | null
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
    isManager: role === 'manager' || role === 'owner',
    isStaff: role === 'staff',
    isLoading: isPending,
  }
}
