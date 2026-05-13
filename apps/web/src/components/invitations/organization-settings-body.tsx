'use client'

import { ApiError } from '@/lib/api-client'
import { useInvitations } from '@/lib/hooks/use-invitations'
import { mapApiError } from '@/lib/map-api-error'
import { InvitationList } from './invitation-list'
import { InviteForm } from './invite-form'

export function OrganizationSettingsBody() {
  const query = useInvitations()

  if (query.isLoading) {
    return (
      <div className="space-y-3">
        <div className="h-24 w-full animate-pulse rounded-md bg-muted" />
        <div className="h-48 w-full animate-pulse rounded-md bg-muted" />
      </div>
    )
  }

  if (query.isError) {
    const err = query.error
    if (err instanceof ApiError && err.code === 'forbidden') {
      return (
        <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          Only owners and managers can manage invitations.
        </div>
      )
    }
    return (
      <div className="rounded-md border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {mapApiError(err)}
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <InviteForm />
      <InvitationList data={query.data} />
    </div>
  )
}
