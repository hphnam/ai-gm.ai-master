import { redirect } from 'next/navigation'
import { VenueProfilesBody } from '@/components/venues/venue-profiles-body'
import { getServerSession, isManagerRole } from '@/lib/server-session'

export default async function VenueProfilesPage() {
  const session = await getServerSession()
  if (!isManagerRole(session?.membership?.role)) redirect('/settings/phone')

  return (
    <section aria-labelledby="venues-settings-title">
      <h2 id="venues-settings-title" className="sr-only">
        Venue profiles
      </h2>
      <VenueProfilesBody />
    </section>
  )
}
