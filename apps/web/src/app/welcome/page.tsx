import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/server-session'
import { getServerVenues } from '@/lib/server-venues'
import { ONBOARDING_STEPS, type OnboardingStepId } from './steps'
import { WelcomeBody } from './welcome-body'

export const dynamic = 'force-dynamic'

type SearchParams = { step?: string; venueId?: string }

function isStepId(value: string | undefined): value is OnboardingStepId {
  return Boolean(value && ONBOARDING_STEPS.some((s) => s.id === value))
}

export default async function WelcomePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  // Session and venues are independent cookie-based fetches — run them
  // together rather than as a waterfall. getServerVenues returns null on a
  // missing session, so fetching it before the redirect check is harmless.
  const [session, venuesResult, params] = await Promise.all([
    getServerSession(),
    getServerVenues(),
    searchParams,
  ])
  if (!session) redirect('/auth/sign-in?redirect=/welcome')

  const venues = venuesResult ?? []
  const requestedStep: OnboardingStepId = isStepId(params.step) ? params.step : 'basics'

  // Returning users with venues land here only when they explicitly continue
  // an in-progress onboarding (?venueId=...). Otherwise punt to /chat.
  if (venues.length > 0 && !params.venueId) {
    redirect('/chat')
  }

  // Step 1 owns venue creation. Any step beyond basics needs a venueId, and
  // it must belong to this org — otherwise we send them back to basics so the
  // URL can't be tampered into pointing at a venue they don't own.
  const venueId = params.venueId ?? null
  const venue = venueId ? (venues.find((v) => v.id === venueId) ?? null) : null
  const step: OnboardingStepId = requestedStep === 'basics' || venue ? requestedStep : 'basics'

  return (
    <WelcomeBody
      initialStep={step}
      venueId={venue?.id ?? null}
      initialVenue={
        venue
          ? { name: venue.name, type: venue.type, address: venue.address, timezone: venue.timezone }
          : null
      }
      userName={session.user.name}
    />
  )
}
