import { VenueProfilesBody } from '@/components/venues/venue-profiles-body'
import { PageHeader } from '@/components/shell/page-header'

export default function VenueProfilesPage() {
  return (
    <>
      <PageHeader
        title="Venue profiles"
        description="Layout, safety, opening hours, deliveries — context the chat reads on every reply."
      />
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
          <VenueProfilesBody />
        </div>
      </div>
    </>
  )
}
