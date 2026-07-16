import { Container, SolidButton } from './primitives'

// Closing call-to-action reused at the foot of the features, about and blog
// pages. Ledger-rule background, serif headline, printed brass CTA.
export function CtaBand({
  title = 'Try it with your venue’s own docs.',
  subtitle = 'Connect Square, load your docs, and ask your first question this afternoon. 14-day free trial, no card.',
}: {
  title?: string
  subtitle?: string
}) {
  return (
    <section style={{ background: 'var(--ledger-rule), var(--paper)' }}>
      <Container className="py-[110px] text-center">
        <h2 className="font-news mx-auto max-w-[18ch] text-balance text-[clamp(2.25rem,4vw,3.25rem)] font-extrabold leading-[1.05] tracking-[-0.028em]">
          {title}
        </h2>
        <p className="mx-auto mt-4 max-w-[46ch] text-[17px] leading-[1.6] text-[var(--ink-muted)] text-pretty">
          {subtitle}
        </p>
        <div className="mt-9 flex items-center justify-center gap-3.5">
          <SolidButton href="/auth/sign-up" size="lg">
            Start free trial
          </SolidButton>
          <span className="font-mono-ledger text-[12.5px] text-[var(--mono-muted)]">
            14 days · no card
          </span>
        </div>
      </Container>
    </section>
  )
}
