'use client'

import { Alert } from '@/components/ui/alert'
import { SettingsPageHeader } from '@/components/ui/setting-card'
import { WhatsappInviteList } from '@/components/whatsapp-invitations/whatsapp-invite-list'
import { ApiError } from '@/lib/api-client'
import { useInvitations } from '@/lib/hooks/use-invitations'
import { useWhatsappInvites } from '@/lib/hooks/use-whatsapp-invites'
import { mapApiError } from '@/lib/map-api-error'
import { InvitationList } from './invitation-list'
import { InviteForm } from './invite-form'
import { MembersList } from './members-list'

// Each card owns its own data + loading state (MembersList self-fetches; the
// invite form is fully static), so the page paints its structure immediately
// and only the data regions inside each card fill in — no whole-page skeleton.
export function TeamSettingsBody() {
  const query = useInvitations()
  const phoneInvites = useWhatsappInvites()

  const invitationsForbidden =
    query.isError && query.error instanceof ApiError && query.error.code === 'forbidden'

  return (
    <div>
      <SettingsPageHeader
        title="Team"
        description="Invite teammates, set what they can access, and manage who's on your team."
      />
      <div className="space-y-6">
        <MembersList />
        <InviteForm />
        {query.isError && !invitationsForbidden ? (
          <Alert variant="destructive">{mapApiError(query.error)}</Alert>
        ) : (
          <InvitationList data={query.data} isLoading={query.isLoading} />
        )}
        <WhatsappInviteList data={phoneInvites.data} />
      </div>
    </div>
  )
}
