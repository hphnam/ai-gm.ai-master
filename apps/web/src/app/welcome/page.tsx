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
  const session = await getServerSession()
  if (!session) redirect('/auth/sign-in?redirect=/welcome')

  const params = await searchParams
  const venues = (await getServerVenues()) ?? []
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
  const venueIdValid = venueId ? venues.some((v) => v.id === venueId) : false
  const step: OnboardingStepId =
    requestedStep === 'basics' || venueIdValid ? requestedStep : 'basics'

  return (
    <WelcomeBody
      initialStep={step}
      venueId={venueIdValid ? venueId : null}
      userName={session.user.name}
    />
  )
}
