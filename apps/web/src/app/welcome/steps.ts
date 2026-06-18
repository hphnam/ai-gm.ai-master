export const ONBOARDING_STEPS = [
  { id: 'basics', label: 'Basics', shortLabel: 'Basics' },
  { id: 'operations', label: 'Operations', shortLabel: 'Ops' },
  { id: 'safety', label: 'Safety', shortLabel: 'Safety' },
  { id: 'knowledge', label: 'Knowledge', shortLabel: 'Files' },
  { id: 'done', label: 'Done', shortLabel: 'Done' },
] as const

export type OnboardingStepId = (typeof ONBOARDING_STEPS)[number]['id']

export function stepIndex(id: OnboardingStepId): number {
  return ONBOARDING_STEPS.findIndex((s) => s.id === id)
}

export function nextStep(id: OnboardingStepId): OnboardingStepId | null {
  const i = stepIndex(id)
  return i < ONBOARDING_STEPS.length - 1 ? (ONBOARDING_STEPS[i + 1]?.id ?? null) : null
}

export function prevStep(id: OnboardingStepId): OnboardingStepId | null {
  const i = stepIndex(id)
  return i > 0 ? (ONBOARDING_STEPS[i - 1]?.id ?? null) : null
}
