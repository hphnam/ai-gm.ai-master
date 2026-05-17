'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback } from 'react'
import { OnboardingShell } from './onboarding-shell'
import { ProgressHeader } from './progress-header'
import { StepBasics } from './step-basics'
import { StepDone } from './step-done'
import { StepKnowledge } from './step-knowledge'
import { StepOperations } from './step-operations'
import { StepSafety } from './step-safety'
import { type OnboardingStepId, prevStep } from './steps'

type Props = {
  initialStep: OnboardingStepId
  venueId: string | null
  userName: string | null
}

export function WelcomeBody({ initialStep, venueId, userName }: Props) {
  const router = useRouter()
  const params = useSearchParams()
  const step = (params.get('step') as OnboardingStepId | null) ?? initialStep

  const go = useCallback(
    (nextStepId: OnboardingStepId, nextVenueId?: string | null) => {
      const sp = new URLSearchParams()
      sp.set('step', nextStepId)
      const vid = nextVenueId ?? venueId
      if (vid) sp.set('venueId', vid)
      router.replace(`/welcome?${sp.toString()}`)
    },
    [router, venueId],
  )

  const onBack = useCallback(() => {
    const back = prevStep(step)
    if (back) go(back)
  }, [step, go])

  return (
    <OnboardingShell header={<ProgressHeader current={step} />}>
      {step === 'basics' && (
        <StepBasics userName={userName} initialVenueId={venueId} onAdvance={go} />
      )}
      {step === 'operations' && venueId && (
        <StepOperations venueId={venueId} onAdvance={go} onBack={onBack} />
      )}
      {step === 'safety' && venueId && (
        <StepSafety venueId={venueId} onAdvance={go} onBack={onBack} />
      )}
      {step === 'knowledge' && venueId && (
        <StepKnowledge venueId={venueId} onAdvance={go} onBack={onBack} />
      )}
      {step === 'done' && venueId && <StepDone venueId={venueId} />}
    </OnboardingShell>
  )
}
