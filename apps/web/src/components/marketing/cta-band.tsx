import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Container } from './primitives'

// Closing call-to-action reused at the foot of the landing, features and
// pricing pages so the trial offer is always one scroll away.
export function CtaBand({
  title = 'Try it with your venue’s own docs.',
  subtitle = '14-day free trial. No credit card. Connect Square and ask your first question in minutes.',
}: {
  title?: string
  subtitle?: string
}) {
  return (
    <section className="py-20 sm:py-28">
      <Container>
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-14 text-center sm:px-12">
          <div
            className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-48 w-[36rem] max-w-full rounded-full bg-[var(--chart-2)]/15 blur-3xl"
            aria-hidden
          />
          <h2 className="relative mx-auto max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h2>
          <p className="relative mx-auto mt-4 max-w-xl text-pretty text-base text-muted-foreground sm:text-lg">
            {subtitle}
          </p>
          <div className="relative mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg">
              <Link href="/auth/sign-up">Start free trial</Link>
            </Button>
            <Button asChild size="lg" variant="outline">
              <Link href="/features">See how it works</Link>
            </Button>
          </div>
        </div>
      </Container>
    </section>
  )
}
