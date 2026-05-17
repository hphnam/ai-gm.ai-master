import { cn } from '@/lib/utils'
import { ONBOARDING_STEPS, type OnboardingStepId, stepIndex } from './steps'

export function ProgressHeader({ current }: { current: OnboardingStepId }) {
  const currentIndex = stepIndex(current)
  return (
    <div className="flex items-center justify-end gap-3">
      <span className="hidden text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:inline">
        Step {currentIndex + 1} of {ONBOARDING_STEPS.length}
      </span>
      <ol
        className="flex items-center gap-1.5"
        aria-label={`Onboarding step ${currentIndex + 1} of ${ONBOARDING_STEPS.length}`}
      >
        {ONBOARDING_STEPS.map((s, i) => {
          const state: 'done' | 'current' | 'todo' =
            i < currentIndex ? 'done' : i === currentIndex ? 'current' : 'todo'
          return (
            <li
              key={s.id}
              className={cn(
                'h-1.5 rounded-full transition-all',
                state === 'done' && 'w-4 bg-foreground/70',
                state === 'current' && 'w-8 bg-foreground',
                state === 'todo' && 'w-4 bg-border',
              )}
              aria-label={`${s.label}${state === 'current' ? ' (current)' : ''}`}
            />
          )
        })}
      </ol>
    </div>
  )
}
