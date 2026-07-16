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
    'Simple per-venue pricing for independent hospitality operators. 14-day free trial, no credit card.',
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
      'POS integration',
      'Live P&L, labour & pricing answers',
      'Venue SOP starter library',
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
    name: 'Multi-site',
    price: 'Custom',
    cadence: '',
    blurb: 'Larger estates, mixed venue types, or a specialist POS.',
    cta: { label: 'Talk to us', href: 'mailto:hello@ai-gm.ai' },
    features: [
      'Everything in Group',
      'Custom & specialist integrations',
      'Custom SOP onboarding',
      'Dedicated onboarding partner',
      'Volume pricing',
    ],
  },
]

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Do I need to connect my POS?',
    a: 'Yes. AI-GM’s edge is that it grounds answers in your real sales and labour data. Your POS connects in minutes, read-only. Without a POS connected you lose half the product, so we don’t sell a SOP-only tier.',
  },
  {
    q: 'What does the free trial include?',
    a: 'The full Group plan for 14 days: POS integration, the venue starter library, and unlimited chat. No credit card required to start.',
  },
  {
    q: 'How is a “venue” counted?',
    a: 'A venue is one trading site with its own POS location. A group with a bar, a kitchen and two sister sites is four venues. You’re only billed for venues that are actively connected.',
  },
  {
    q: 'Which POS do you support?',
    a: 'Square today. GoTab, Arryved and more are on the roadmap. We focus on modern SMB hospitality POS, so heavyweight enterprise systems (Oracle, NCR Aloha) are out of scope for now.',
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
          <h1 className="font-news max-w-2xl text-balance text-[clamp(2.5rem,4vw,3.25rem)] font-extrabold leading-[1.05] tracking-[-0.03em]">
            Priced per venue. Built for independents.
          </h1>
          <p className="max-w-xl text-pretty text-lg leading-relaxed text-muted-foreground">
            No per-seat tax, no enterprise sales dance. Start free for 14 days, connect your POS,
            and ask your first question this afternoon.
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
                  ? 'border-[var(--brass)] shadow-[0_24px_60px_-24px_rgba(143,107,31,0.35)]'
                  : 'border-border',
              )}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-news text-[22px] font-bold tracking-[-0.01em]">{tier.name}</h2>
                {tier.featured ? (
                  <span className="rounded-full bg-primary px-2.5 py-1 text-[11px] font-medium text-primary-foreground">
                    Most popular
                  </span>
                ) : null}
              </div>
              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="font-mono-ledger text-4xl font-bold tracking-tight tabular-nums">
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
