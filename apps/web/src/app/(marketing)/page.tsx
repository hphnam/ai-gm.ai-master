import { Check } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { ChatPreview } from '@/components/marketing/chat-preview'
import { FEATURES, PROBLEMS, QUESTIONS } from '@/components/marketing/content'
import { CtaBand } from '@/components/marketing/cta-band'
import { ForecastSection } from '@/components/marketing/forecast-section'
import { Container, Eyebrow, SectionHeading } from '@/components/marketing/primitives'
import { StructuredData } from '@/components/marketing/structured-data'
import { Button } from '@/components/ui/button'
import { pageMetadata } from '@/lib/seo'
import { cn } from '@/lib/utils'

const HOME_DESCRIPTION =
  'Today’s margin, tonight’s labour, next week’s events, all in one chat. gm-ai connects your POS, accounting and calendar with your venue’s own SOPs so your team stops switching between five tools to answer one question.'

export const metadata: Metadata = {
  ...pageMetadata({
    title: 'Your AI operator for hospitality',
    description: HOME_DESCRIPTION,
    path: '/',
  }),
  title: { absolute: 'gm-ai — Your AI operator for hospitality' },
}

const TRUST = ['14-day free trial', 'No credit card', 'Set up in an afternoon']

const STEPS = [
  {
    n: 1,
    title: 'Connect your tools',
    body: 'Connect your POS, accounting, payroll and calendar. gm-ai reads your sales, labour and bookings, all read-only and scoped to each venue.',
  },
  {
    n: 2,
    title: 'Load your SOPs',
    body: 'Drop in your prep sheets, compliance docs and supplier lists, or start from the hospitality library tuned to your venue type.',
  },
  {
    n: 3,
    title: 'Ask anything',
    body: 'GP, labour, pricing, events, prep, who to call. One chat, grounded in your numbers and your docs, with a citation on every answer.',
  },
]

// Bento arrangement of the six capabilities, ordered for narrative rather than
// symmetry: a wide flagship, a three-up middle row, and a full-width closer.
const [FLAGSHIP, PRICING, LABOUR, CITED, CELLAR, CAPTURE] = FEATURES

export default function MarketingHome() {
  return (
    <>
      <StructuredData />

      {/* Hero — asymmetric split, product artifact on the right */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -top-32 left-1/2 h-[34rem] w-[64rem] max-w-[120vw] -translate-x-1/2 rounded-full bg-[var(--primary)]/10 blur-3xl"
          aria-hidden
        />
        <Container className="relative grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          <div className="flex flex-col gap-6">
            <Eyebrow>For hospitality operators</Eyebrow>
            <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              Your AI operator for hospitality.
            </h1>
            <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
              Today’s margin, tonight’s labour, next week’s events, all in one chat. gm-ai connects
              your POS, accounting and calendar to your venue’s own SOPs, so your team stops
              switching between five tools to answer one question.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/auth/sign-up">Start free trial</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/features">See how it works</Link>
              </Button>
            </div>
          </div>
          <div className="lg:pl-4">
            <ChatPreview />
          </div>
        </Container>
      </section>

      {/* Proof band — stats plus the trust line that used to crowd the hero */}
      <section className="border-y border-border bg-card/40">
        <Container className="flex flex-col gap-6 py-10 lg:flex-row lg:items-center lg:justify-between lg:gap-10">
          <div className="grid flex-1 gap-6 sm:grid-cols-3 lg:gap-10">
            {[
              { stat: '586', label: 'messages in the first 19 days, still accelerating' },
              {
                stat: '4 venues',
                label: 'one hospitality group running every site on it, live today',
              },
              { stat: '70+', label: 'venue SOPs in the loop, cited on every answer' },
            ].map((item) => (
              <div key={item.label} className="flex flex-col gap-1">
                <span className="text-3xl font-semibold tracking-tight tabular-nums">
                  {item.stat}
                </span>
                <span className="text-sm text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
          <ul className="flex shrink-0 flex-wrap gap-x-5 gap-y-2 border-t border-border pt-5 lg:flex-col lg:gap-y-2.5 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            {TRUST.map((item) => (
              <li
                key={item}
                className="inline-flex items-center gap-1.5 text-sm text-muted-foreground"
              >
                <Check className="size-4 text-[var(--chart-1)]" /> {item}
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Problem — editorial split: framing left, the four broken surfaces as a
          divided list right. No eyebrow; the headline carries it. */}
      <section className="py-20 sm:py-28">
        <Container className="grid gap-10 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
          <div className="flex flex-col gap-4 lg:sticky lg:top-28 lg:self-start">
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              One question, five tools, no time.
            </h2>
            <p className="text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              Every hospitality operator runs the business across the same broken surfaces.
              Switching between them costs the time you don’t have, and margin slips in places no
              one’s watching.
            </p>
          </div>
          <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border">
            {PROBLEMS.map((item) => (
              <li key={item.surface} className="flex items-start gap-4 bg-card p-5 sm:p-6">
                <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary text-muted-foreground">
                  <item.icon className="size-4.5" />
                </span>
                <div className="flex flex-col gap-1">
                  <h3 className="font-medium">{item.surface}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{item.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {/* Features — bento with rhythm: wide flagship, three-up row, full-width
          closer. Six capabilities, six cells, no empty tiles. */}
      <section className="border-t border-border py-20 sm:py-28">
        <Container className="flex flex-col gap-12">
          <div className="flex max-w-2xl flex-col gap-4">
            <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
              An operator copilot, grounded in your data.
            </h2>
            <p className="text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
              Most tools either search your documents or chart your sales. gm-ai does both in one
              chat, and answers in plain English you can act on.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {/* Flagship — wide, tinted, with a live mini-metric */}
            <BentoCard feature={FLAGSHIP} className="sm:col-span-2 lg:col-span-2" tinted>
              <div className="mt-5 grid grid-cols-3 gap-2">
                {[
                  { label: 'Sales', value: '£3,612' },
                  { label: 'GP', value: '74%' },
                  { label: 'Labour', value: '22%' },
                ].map((m) => (
                  <div
                    key={m.label}
                    className="rounded-lg border border-border bg-background/70 px-3 py-2.5"
                  >
                    <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
                      {m.label}
                    </div>
                    <div className="mt-0.5 text-lg font-semibold tracking-tight tabular-nums">
                      {m.value}
                    </div>
                  </div>
                ))}
              </div>
            </BentoCard>

            <BentoCard feature={PRICING} />
            <BentoCard feature={LABOUR} />
            <BentoCard feature={CITED} />
            <BentoCard feature={CELLAR} />

            {/* Full-width closer */}
            <BentoCard
              feature={CAPTURE}
              className="sm:col-span-2 lg:col-span-3"
              layout="row"
              tinted
            />
          </div>
        </Container>
      </section>

      {/* Forecasting — the strongest section, kept intact */}
      <ForecastSection />

      {/* How it works — horizontal connected timeline, not a card row */}
      <section className="py-16 sm:py-24">
        <Container className="flex flex-col gap-14">
          <h2 className="max-w-2xl text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
            Live in an afternoon.
          </h2>
          <ol className="relative grid gap-10 md:grid-cols-3 md:gap-8">
            {/* Connecting rail behind the nodes, desktop only */}
            <span
              className="pointer-events-none absolute left-0 right-0 top-4 hidden h-px bg-border md:block"
              aria-hidden
            />
            {STEPS.map((step) => (
              <li key={step.n} className="relative flex flex-col gap-3">
                <span className="flex size-8 items-center justify-center rounded-full border border-border bg-background text-sm font-semibold tabular-nums text-foreground">
                  {step.n}
                </span>
                <h3 className="mt-1 text-lg font-medium">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      {/* Questions — verbatim usage as tagged rows (distinct pill-row family) */}
      <section className="border-t border-border py-20 sm:py-28">
        <Container className="flex flex-col gap-12">
          <SectionHeading
            eyebrow="Real usage"
            title="The questions it answers today."
            lede="Every one is verbatim from one real operator’s last 30 days, running live in production. Your venue’s questions look different; the shape is the same."
          />
          <div className="grid gap-3 sm:grid-cols-2">
            {QUESTIONS.map((item) => (
              <div
                key={item.q}
                className="flex items-center gap-4 rounded-xl border border-border bg-card px-5 py-4"
              >
                <span className="text-sm font-medium text-foreground">{item.q}</span>
                <span className="ml-auto shrink-0 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  {item.tag}
                </span>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Testimonial — quote stands on its own, no eyebrow */}
      <section className="py-20 sm:py-28">
        <Container>
          <figure className="mx-auto flex max-w-3xl flex-col gap-6 text-center">
            <blockquote className="text-balance text-2xl font-medium leading-snug tracking-tight sm:text-3xl">
              “I want to know last night’s margin this morning, not next week off a spreadsheet.
              gm-ai is the first thing that answers that the way I’d actually ask it.”
            </blockquote>
            <figcaption className="text-sm text-muted-foreground">
              Owner-operator · four-pub craft group &amp; brewery · primary daily user
            </figcaption>
          </figure>
        </Container>
      </section>

      <CtaBand />
    </>
  )
}

// A single bento tile. `layout="row"` lays the icon beside the copy for the
// full-width closer; `tinted` gives a cell real visual variation so the grid
// isn't six identical white cards.
function BentoCard({
  feature,
  className,
  layout = 'stack',
  tinted = false,
  children,
}: {
  feature: (typeof FEATURES)[number]
  className?: string
  layout?: 'stack' | 'row'
  tinted?: boolean
  children?: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'flex flex-col rounded-xl border border-border p-6 sm:p-7',
        tinted ? 'bg-gradient-to-br from-secondary/50 to-card' : 'bg-card',
        layout === 'row' && 'sm:flex-row sm:items-center sm:gap-6',
        className,
      )}
    >
      <div className={cn('flex flex-col gap-3', layout === 'row' && 'sm:max-w-md')}>
        <span className="flex size-9 items-center justify-center rounded-lg bg-secondary text-foreground">
          <feature.icon className="size-4.5" />
        </span>
        <h3 className="mt-1 font-medium">{feature.title}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{feature.body}</p>
      </div>
      {children}
    </div>
  )
}
