import { HydrationBoundary } from '@tanstack/react-query'
import { redirect } from 'next/navigation'
import { SettingsPageHeader } from '@/components/ui/setting-card'
import { VenueProfilesBody } from '@/components/venues/venue-profiles-body'
import { venuesListQuery } from '@/lib/queries/keys'
import { dehydrateSpecs } from '@/lib/server-prefetch'
import { getServerSession, isManagerRole } from '@/lib/server-session'

export default async function VenueProfilesPage() {
  const session = await getServerSession()
  const isManager = isManagerRole(session?.membership?.role)
  if (!isManager) redirect('/settings/phone')

  const state = await dehydrateSpecs([venuesListQuery])
  return (
    <div>
      <SettingsPageHeader
        title="Venues"
        description="Manage your sites and the operational details GM uses per venue."
      />
      <HydrationBoundary state={state}>
        <VenueProfilesBody isManager={isManager} />
      </HydrationBoundary>
    </div>
  )
}
