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

const HOME_DESCRIPTION =
  'Today’s margin, tonight’s labour, last week’s cellar log, all in one chat. gm-ai connects your Square data with your venue’s own SOPs so your GM stops switching between five tools to answer one question.'

export const metadata: Metadata = {
  ...pageMetadata({
    title: 'Your AI operator for the brewpub',
    description: HOME_DESCRIPTION,
    path: '/',
  }),
  title: { absolute: 'gm-ai — Your AI operator for the brewpub' },
}

const STEPS = [
  {
    n: '01',
    title: 'Connect your POS',
    body: 'Link Square in two minutes. gm-ai reads sales, tenders, items and labour, all read-only and scoped to each venue.',
  },
  {
    n: '02',
    title: 'Load your SOPs',
    body: 'Drop in your cellar logs, compliance docs and supplier sheets, or start from the brewpub library that already knows beer.',
  },
  {
    n: '03',
    title: 'Ask anything',
    body: 'GP, labour, pricing, line cleaning, who to call. One chat, grounded in your numbers and your docs, with a citation on every answer.',
  },
]

export default function MarketingHome() {
  return (
    <>
      <StructuredData />
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -top-32 left-1/2 h-[34rem] w-[64rem] max-w-[120vw] -translate-x-1/2 rounded-full bg-[var(--chart-2)]/10 blur-3xl"
          aria-hidden
        />
        <Container className="relative grid items-center gap-12 py-16 sm:py-24 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
          <div className="flex flex-col gap-6">
            <Eyebrow>For brewpub & beerhall operators</Eyebrow>
            <h1 className="text-balance text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl lg:text-[3.4rem]">
              Your AI operator for the brewpub.
            </h1>
            <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
              Today’s margin, tonight’s labour, last week’s cellar log, all in one chat. gm-ai
              connects your Square data to your venue’s own SOPs, so your GM stops switching between
              five tools to answer one question.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/auth/sign-up">Start free trial</Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/features">See how it works</Link>
              </Button>
            </div>
            <p className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-[var(--chart-1)]" /> 14-day free trial
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-[var(--chart-1)]" /> No credit card
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Check className="size-4 text-[var(--chart-1)]" /> Square-ready
              </span>
            </p>
          </div>
          <div className="lg:pl-4">
            <ChatPreview />
          </div>
        </Container>
      </section>

      {/* Proof strip */}
      <section className="border-y border-border bg-card/40">
        <Container className="grid gap-6 py-10 sm:grid-cols-3">
          {[
            { stat: '586', label: 'messages in the first 19 days, still accelerating' },
            { stat: '4 pubs', label: 'craft group running on it in production' },
            { stat: '70+', label: 'venue SOPs in the loop, cited on every answer' },
          ].map((item) => (
            <div key={item.label} className="flex flex-col gap-1 text-center sm:text-left">
              <span className="text-3xl font-semibold tracking-tight tabular-nums">
                {item.stat}
              </span>
              <span className="text-sm text-muted-foreground">{item.label}</span>
            </div>
          ))}
        </Container>
      </section>

      {/* Problem */}
      <section className="py-20 sm:py-28">
        <Container className="flex flex-col gap-12">
          <SectionHeading
            eyebrow="The problem"
            title="One question, five tools, no time."
            lede="GMs of craft-led pubs run the business across four broken surfaces. Switching between them costs the time the GM doesn’t have, and margin slips in places no one’s watching."
          />
          <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2 lg:grid-cols-4">
            {PROBLEMS.map((item) => (
              <div key={item.surface} className="flex flex-col gap-3 bg-card p-6">
                <item.icon className="size-5 text-muted-foreground" />
                <h3 className="font-medium">{item.surface}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Features */}
      <section className="border-t border-border py-20 sm:py-28">
        <Container className="flex flex-col gap-12">
          <SectionHeading
            eyebrow="What it does"
            title="An operator copilot, grounded in your data."
            lede="Most tools either search your documents or chart your sales. gm-ai does both in one chat, and answers in plain English you can act on."
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

      {/* Forecasting */}
      <ForecastSection />

      {/* How it works */}
      <section className="border-t border-border py-20 sm:py-28">
        <Container className="flex flex-col gap-12">
          <SectionHeading
            eyebrow="How it works"
            title="Live in an afternoon."
            align="center"
            className="mx-auto items-center"
          />
          <div className="grid gap-8 md:grid-cols-3">
            {STEPS.map((step) => (
              <div key={step.n} className="flex flex-col gap-3">
                <span className="text-sm font-semibold tabular-nums text-muted-foreground">
                  {step.n}
                </span>
                <div className="h-px w-full bg-border" aria-hidden />
                <h3 className="mt-1 text-lg font-medium">{step.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{step.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      {/* Questions showcase */}
      <section className="border-t border-border py-20 sm:py-28">
        <Container className="flex flex-col gap-12">
          <SectionHeading
            eyebrow="Real usage"
            title="The questions it answers today."
            lede="Every one of these is a verbatim pattern from a working brewpub operator’s last 30 days. The product handles all of them now."
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

      {/* Testimonial / why now */}
      <section className="border-t border-border py-20 sm:py-28">
        <Container>
          <figure className="mx-auto flex max-w-3xl flex-col gap-6 text-center">
            <Eyebrow>
              <span className="mx-auto">Built with an operator</span>
            </Eyebrow>
            <blockquote className="text-balance text-2xl font-medium leading-snug tracking-tight sm:text-3xl">
              “I want to know last night’s margin this morning, not next week off a spreadsheet.
              gm-ai is the first thing that answers that the way I’d actually ask it.”
            </blockquote>
            <figcaption className="text-sm text-muted-foreground">
              Owner-operator · four-pub craft group & brewery · primary daily user
            </figcaption>
          </figure>
        </Container>
      </section>

      <CtaBand />
    </>
  )
}
