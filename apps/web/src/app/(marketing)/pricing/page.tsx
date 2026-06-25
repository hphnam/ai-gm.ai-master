import { Check } from 'lucide-react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Container, Eyebrow, SectionHeading } from '@/components/marketing/primitives'
import { Button } from '@/components/ui/button'
import { pageMetadata } from '@/lib/seo'
import { cn } from '@/lib/utils'

export const metadata: Metadata = pageMetadata({
  title: 'Pricing',
  description:
    'Simple per-venue pricing for independent brewpub and beerhall operators. 14-day free trial, no credit card.',
  path: '/pricing',
})

type Tier = {
  name: string
  price: string
  cadence: string
  blurb: string
  cta: { label: string; href: string }
  featured?: boolean
  features: string[]
}

const TIERS: Tier[] = [
  {
    name: 'Single venue',
    price: '£89',
    cadence: '/ venue / month',
    blurb: 'For the owner-operator running one site hands-on.',
    cta: { label: 'Start free trial', href: '/auth/sign-up' },
    features: [
      'Square POS integration',
      'Live P&L, labour & pricing answers',
      'Brewpub SOP starter library',
      'Unlimited chat & knowledge capture',
      'Cited sources on every answer',
      'Email support',
    ],
  },
  {
    name: 'Group',
    price: '£69',
    cadence: '/ venue / month',
    blurb: 'For 2 to 5 venues under one operator. Billed per active venue.',
    cta: { label: 'Start free trial', href: '/auth/sign-up' },
    featured: true,
    features: [
      'Everything in Single venue',
      'P&L and labour by venue',
      'Cross-venue pricing comparison',
      'Team roles (owner, manager, staff)',
      'WhatsApp staff channel (beta)',
      'Priority support',
    ],
  },
  {
    name: 'Brewery+',
    price: 'Custom',
    cadence: '',
    blurb: 'Brewery plus tap rooms and sister sites, or a brewery-native POS.',
    cta: { label: 'Talk to us', href: 'mailto:hello@gm-ai.app' },
    features: [
      'Everything in Group',
      'GoTab / Arryved integration',
      'Custom SOP onboarding',
      'Dedicated onboarding partner',
      'Volume pricing',
    ],
  },
]

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Do I need to connect my POS?',
    a: 'Yes. gm-ai’s edge is that it grounds answers in your real sales and labour data. Square connects in two minutes, read-only. Without a POS connected you lose half the product, so we don’t sell a SOP-only tier.',
  },
  {
    q: 'What does the free trial include?',
    a: 'The full Group plan for 14 days: POS integration, the brewpub starter library, and unlimited chat. No credit card required to start.',
  },
  {
    q: 'How is a “venue” counted?',
    a: 'A venue is one trading site with its own POS location. A brewery with a tap room and two sister pubs is four venues. You’re only billed for venues that are actively connected.',
  },
  {
    q: 'Which POS do you support?',
    a: 'Square today. GoTab and Arryved are next, within 90 days of launch. Toast and Lightspeed are on the roadmap. Enterprise restaurant POS (Oracle, NCR Aloha) is deliberately out of scope.',
  },
  {
    q: 'Is my data used to train models?',
    a: 'No. Your POS data and documents are used to answer your questions, scoped to your organisation. We don’t train models on your venue’s data.',
  },
]

export default function PricingPage() {
  return (
    <>
      <section className="border-b border-border">
        <Container className="flex flex-col items-center gap-5 py-16 text-center sm:py-20">
          <Eyebrow>
            <span>Pricing</span>
          </Eyebrow>
          <h1 className="max-w-2xl text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            Priced per venue. Built for independents.
          </h1>
          <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            No per-seat tax, no enterprise sales dance. Start free for 14 days, connect Square, and
            ask your first question this afternoon.
          </p>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container className="grid gap-5 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={cn(
                'flex flex-col rounded-2xl border bg-card p-7',
                tier.featured
                  ? 'border-foreground shadow-lg shadow-foreground/[0.06]'
                  : 'border-border',
              )}
            >
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-medium">{tier.name}</h2>
                {tier.featured ? (
                  <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground">
                    Most popular
                  </span>
                ) : null}
              </div>
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="text-4xl font-semibold tracking-tight tabular-nums">
                  {tier.price}
                </span>
                {tier.cadence ? (
                  <span className="text-sm text-muted-foreground">{tier.cadence}</span>
                ) : null}
              </div>
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{tier.blurb}</p>
              <Button asChild className="mt-6" variant={tier.featured ? 'default' : 'outline'}>
                <Link href={tier.cta.href}>{tier.cta.label}</Link>
              </Button>
              <ul className="mt-7 space-y-3 border-t border-border pt-7">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm">
                    <Check className="mt-0.5 size-4 shrink-0 text-[var(--chart-1)]" />
                    <span className="text-foreground/90">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </Container>
      </section>

      <section className="border-t border-border py-20 sm:py-24">
        <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading eyebrow="FAQ" title="Questions, answered." />
          <dl className="divide-y divide-border border-y border-border">
            {FAQS.map((faq) => (
              <div key={faq.q} className="py-5">
                <dt className="font-medium">{faq.q}</dt>
                <dd className="mt-2 text-sm leading-relaxed text-muted-foreground">{faq.a}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>
    </>
  )
}
