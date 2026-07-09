import type { Metadata } from 'next'
import { FEATURES, INTEGRATIONS, QUESTIONS } from '@/components/marketing/content'
import { CtaBand } from '@/components/marketing/cta-band'
import { ForecastSection } from '@/components/marketing/forecast-section'
import { HeroChat } from '@/components/marketing/hero-chat'
import { Container, Diamond, Eyebrow, SectionHeading } from '@/components/marketing/primitives'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Features',
  description:
    'POS-grounded answers, a starter library tuned to your venue, cited SOP retrieval and in-chat knowledge capture. See what AI-GM does for hospitality operators.',
  path: '/features',
})

const STATUS_LABEL: Record<string, string> = {
  live: 'Live',
  next: 'Next',
  later: 'Later',
}

export default function FeaturesPage() {
  return (
    <>
      <section className="border-b border-[var(--hairline)]">
        <Container className="grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-2">
          <div>
            <Eyebrow className="mb-6">Features</Eyebrow>
            <h1 className="font-news text-balance text-[clamp(2.5rem,4vw,3.25rem)] font-extrabold leading-[1.05] tracking-[-0.03em]">
              Everything a GM asks, in one grounded chat.
            </h1>
            <p className="mt-5 max-w-xl text-[18px] leading-[1.6] text-[var(--ink-muted)] text-pretty">
              AI-GM joins your live POS data to your venue&apos;s own documents. It answers the
              P&amp;L question and the ops question with the same confidence, and shows its working.
            </p>
          </div>
          <HeroChat />
        </Container>
      </section>

      <section className="py-20 sm:py-24">
        <Container className="flex flex-col gap-12">
          <SectionHeading
            eyebrow="Capabilities"
            title="Built for the hospitality operator’s day."
          />
          <div className="grid gap-px overflow-hidden rounded-xl border border-[var(--hairline)] bg-[var(--hairline)] md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex flex-col gap-3 bg-[var(--ledger-card)] p-7">
                <span className="flex size-9 items-center justify-center rounded-lg bg-[var(--paper-2)] text-[var(--brass)]">
                  <feature.icon className="size-[18px]" />
                </span>
                <h3 className="font-news mt-1 text-[19px] font-bold tracking-[-0.01em]">
                  {feature.title}
                </h3>
                <p className="text-[14.5px] leading-[1.6] text-[var(--ink-muted)]">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <ForecastSection />

      <section
        id="integrations"
        className="scroll-mt-20 border-t border-[var(--hairline)] py-20 sm:py-24"
      >
        <Container className="flex flex-col gap-12">
          <SectionHeading
            eyebrow="Integrations"
            title="Connect your whole stack."
            lede="AI-GM reads across your POS, accounting, payroll and calendar. Square is live today and more are rolling out. Each one drops in without changing how you work."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {INTEGRATIONS.map((integration) => (
              <div
                key={integration.name}
                className="flex items-center justify-between rounded-xl border border-[var(--hairline)] bg-[var(--ledger-card)] px-5 py-4"
              >
                <span className="font-semibold">{integration.name}</span>
                <span
                  className={
                    integration.status === 'live'
                      ? 'font-mono-ledger inline-flex items-center gap-1.5 rounded-full bg-[var(--paper-2)] px-2.5 py-1 text-[11px] font-medium text-[var(--ink-text)]'
                      : 'font-mono-ledger rounded-full border border-[var(--hairline)] px-2.5 py-1 text-[11px] font-medium text-[var(--ink-muted)]'
                  }
                >
                  {integration.status === 'live' ? (
                    <span className="size-1.5 rounded-full bg-[var(--ledger-green)]" aria-hidden />
                  ) : null}
                  {STATUS_LABEL[integration.status]}
                </span>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-[var(--hairline)] py-20 sm:py-24">
        <Container className="flex flex-col gap-12">
          <SectionHeading eyebrow="In practice" title="Ask it like you’d ask your best manager." />
          <ul className="grid gap-3 sm:grid-cols-2">
            {QUESTIONS.map((item) => (
              <li
                key={item.q}
                className="flex items-start gap-3 rounded-xl border border-[var(--hairline)] bg-[var(--ledger-card)] px-5 py-4"
              >
                <Diamond className="mt-1.5 flex-none" />
                <span className="text-[14.5px] text-[var(--ink-text)]">{item.q}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <CtaBand />
    </>
  )
}
