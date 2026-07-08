'use client'

import { BusinessProfileForm } from '@/components/organization/business-profile-form'
import { Alert } from '@/components/ui/alert'
import { Skeleton } from '@/components/ui/skeleton'
import { WhatsappInviteList } from '@/components/whatsapp-invitations/whatsapp-invite-list'
import { ApiError } from '@/lib/api-client'
import { useInvitations } from '@/lib/hooks/use-invitations'
import { useWhatsappInvites } from '@/lib/hooks/use-whatsapp-invites'
import { mapApiError } from '@/lib/map-api-error'
import { InvitationList } from './invitation-list'
import { InviteForm } from './invite-form'
import { MembersList } from './members-list'

export function OrganizationSettingsBody() {
  const query = useInvitations()
  const phoneInvites = useWhatsappInvites()

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
      <BusinessProfileForm />
      <MembersList />
      <InviteForm />
      <InvitationList data={query.data} />
      <WhatsappInviteList data={phoneInvites.data} />
    </div>
  )
}
