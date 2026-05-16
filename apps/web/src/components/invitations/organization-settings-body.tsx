'use client'

import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
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
        <Skeleton className="h-24 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    )
  }

  if (query.isError) {
    const err = query.error
    if (err instanceof ApiError && err.code === 'forbidden') {
      return <Alert>Only owners and managers can manage invitations.</Alert>
    }
    return <Alert variant="destructive">{mapApiError(err)}</Alert>
  }

  return (
    <div className="space-y-6">
      <MembersList />
      <InviteForm />
      <InvitationList data={query.data} />
    </div>
  )
}
