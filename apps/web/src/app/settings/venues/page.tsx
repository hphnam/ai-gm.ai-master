import { VenueProfilesBody } from '@/components/venues/venue-profiles-body'

export default function VenueProfilesPage() {
  return (
    <section aria-labelledby="venues-settings-title">
      <header className="mb-4">
        <h2 id="venues-settings-title" className="text-base font-semibold tracking-tight">
          Venue profiles
        </h2>
        <p className="text-xs text-muted-foreground">
          Layout, safety, opening hours, deliveries — context the chat reads on every reply.
        </p>
      </header>
      <VenueProfilesBody />
    </section>
  )
}
