'use client'

import { ApiError } from '@/lib/api-client'
import { useInvitations } from '@/lib/hooks/use-invitations'
import { mapApiError } from '@/lib/map-api-error'
import { InvitationList } from './invitation-list'
import { InviteForm } from './invite-form'
import { MembersList } from './members-list'

export function OrganizationSettingsBody() {
  const query = useInvitations()

  if (query.isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-24 w-full animate-pulse rounded-2xl bg-muted" />
        <div className="h-48 w-full animate-pulse rounded-2xl bg-muted" />
      </div>
    )
  }

  if (query.isError) {
    const err = query.error
    if (err instanceof ApiError && err.code === 'forbidden') {
      return (
        <div className="rounded-2xl border border-border bg-card p-5 text-sm text-muted-foreground">
          Only owners and managers can manage invitations.
        </div>
      )
    }
    return (
      <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {mapApiError(err)}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <MembersList />
      <InviteForm />
      <InvitationList data={query.data} />
    </div>
  )
}
