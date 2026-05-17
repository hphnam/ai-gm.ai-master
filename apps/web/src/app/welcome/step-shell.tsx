import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

/// Shared visual chrome for each onboarding step. Keeps spacing, eyebrow
/// label, title, and intro consistent so the steps feel like one flow.
export function StepShell({
  eyebrow,
  title,
  intro,
  children,
  footer,
  className,
}: {
  eyebrow: string
  title: ReactNode
  intro?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('space-y-8', className)}>
      <div className="space-y-2.5">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {eyebrow}
        </p>
        <h1 className="font-display text-2xl font-semibold leading-tight tracking-tight text-foreground sm:text-3xl">
          {title}
        </h1>
        {intro ? (
          <p className="max-w-prose text-sm leading-relaxed text-muted-foreground sm:text-base">
            {intro}
          </p>
        ) : null}
      </div>
      <div>{children}</div>
      {footer ? <div className="border-t border-border/60 pt-5">{footer}</div> : null}
    </div>
  )
}

export function StepFooter({
  onBack,
  onSkip,
  primary,
  helper,
}: {
  onBack?: () => void
  onSkip?: () => void
  primary: ReactNode
  helper?: ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-3 text-sm">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="cursor-pointer text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Back
          </button>
        ) : null}
        {onSkip ? (
          <button
            type="button"
            onClick={onSkip}
            className="cursor-pointer text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            Skip for now
          </button>
        ) : null}
        {helper}
      </div>
      <div className="flex items-center gap-2">{primary}</div>
    </div>
  )
}
