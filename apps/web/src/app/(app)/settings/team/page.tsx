import { HydrationBoundary } from '@tanstack/react-query'
import { redirect } from 'next/navigation'
import { TeamSettingsBody } from '@/components/invitations/team-settings-body'
import { invitationsQuery, orgMembersQuery, whatsappInvitesQuery } from '@/lib/queries/keys'
import { dehydrateSpecs } from '@/lib/server-prefetch'
import { getServerSession, isManagerRole } from '@/lib/server-session'

export default async function TeamSettingsPage() {
  const session = await getServerSession()
  if (!isManagerRole(session?.membership?.role)) redirect('/settings/phone')
  const state = await dehydrateSpecs([orgMembersQuery, invitationsQuery, whatsappInvitesQuery])
  return (
    <HydrationBoundary state={state}>
      <TeamSettingsBody />
    </HydrationBoundary>
  )
}
