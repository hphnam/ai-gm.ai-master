import { Check } from 'lucide-react'
import type { Metadata } from 'next'
import { ChatPreview } from '@/components/marketing/chat-preview'
import { FEATURES, INTEGRATIONS, QUESTIONS } from '@/components/marketing/content'
import { CtaBand } from '@/components/marketing/cta-band'
import { ForecastSection } from '@/components/marketing/forecast-section'
import { Container, Eyebrow, SectionHeading } from '@/components/marketing/primitives'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Features',
  description:
    'POS-grounded answers, a starter library tuned to your venue, cited SOP retrieval and in-chat knowledge capture. See what gm-ai does for hospitality operators.',
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
      <section className="border-b border-border">
        <Container className="grid items-center gap-12 py-16 sm:py-20 lg:grid-cols-[1fr_1fr]">
          <div className="flex flex-col gap-5">
            <Eyebrow>Features</Eyebrow>
            <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
              Everything a GM asks, in one grounded chat.
            </h1>
            <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
              gm-ai joins your live POS data to your venue’s own documents. It answers the P&amp;L
              question and the ops question with the same confidence, and shows its working.
            </p>
          </div>
          <ChatPreview />
        </Container>
      </section>

      <section className="py-20 sm:py-24">
        <Container className="flex flex-col gap-12">
          <SectionHeading
            eyebrow="Capabilities"
            title="Built for the hospitality operator’s day."
          />
          <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border md:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex flex-col gap-3 bg-card p-7">
                <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-foreground">
                  <feature.icon className="size-4.5" />
                </span>
                <h3 className="mt-1 font-medium">{feature.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <ForecastSection />

      <section id="integrations" className="scroll-mt-20 border-t border-border py-20 sm:py-24">
        <Container className="flex flex-col gap-12">
          <SectionHeading
            eyebrow="Integrations"
            title="Connect your whole stack."
            lede="gm-ai reads across your POS, accounting, payroll and calendar. Square is live today and more are rolling out. Each one drops in without changing how you work."
          />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {INTEGRATIONS.map((integration) => (
              <div
                key={integration.name}
                className="flex items-center justify-between rounded-xl border border-border bg-card px-5 py-4"
              >
                <span className="font-medium">{integration.name}</span>
                <span
                  className={
                    integration.status === 'live'
                      ? 'inline-flex items-center gap-1.5 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium text-foreground'
                      : 'rounded-full border border-border px-2.5 py-1 text-[11px] font-medium text-muted-foreground'
                  }
                >
                  {integration.status === 'live' ? (
                    <span className="size-1.5 rounded-full bg-[var(--chart-1)]" aria-hidden />
                  ) : null}
                  {STATUS_LABEL[integration.status]}
                </span>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-border py-20 sm:py-24">
        <Container className="flex flex-col gap-12">
          <SectionHeading eyebrow="In practice" title="Ask it like you’d ask your best manager." />
          <ul className="grid gap-3 sm:grid-cols-2">
            {QUESTIONS.map((item) => (
              <li
                key={item.q}
                className="flex items-start gap-3 rounded-xl border border-border bg-card px-5 py-4"
              >
                <Check className="mt-0.5 size-4 shrink-0 text-[var(--chart-1)]" />
                <span className="text-sm text-foreground">{item.q}</span>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      <CtaBand />
    </>
  )
}
