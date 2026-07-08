import type { Metadata } from 'next'
import { CtaBand } from '@/components/marketing/cta-band'
import { Container, Eyebrow, SectionHeading } from '@/components/marketing/primitives'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'About',
  description:
    'gm-ai is built with a working multi-venue operator, for hospitality managers. Why the category is empty, and why now.',
  path: '/about',
})

const PRINCIPLES = [
  {
    title: 'Grounded in real operations',
    body: 'UK-first, built on a real venue’s day rather than a persona. Generic tools don’t speak the operator’s language of margin, labour, prep and compliance. We do, because the product was shaped on live multi-venue hospitality operations from day one.',
  },
  {
    title: 'POS-grounded, not SOP-only',
    body: 'The difference between “here’s a checklist” and “your GP was 74% last night, put your top line up 30p.” We answer from live POS data and your own documents in one chat. Checklist tools can’t answer the margin question; back-office tools aren’t in the conversation when it’s asked.',
  },
  {
    title: 'Built with an operator, not for a persona',
    body: 'Our design partner runs four venues and a brewery, and uses gm-ai daily. He builds the corpus and finds the gaps for us. We’re not guessing before launch; we’re launching with a customer already doing real work.',
  },
  {
    title: 'Trust is verifiable',
    body: 'Every operational answer cites the document behind it. A GM should be able to open the exact procedure a claim rests on. Asserted confidence is how knowledge drifts and margin slips.',
  },
]

export default function AboutPage() {
  return (
    <>
      <section className="border-b border-border">
        <Container className="flex max-w-3xl flex-col gap-6 py-16 sm:py-24">
          <Eyebrow>About</Eyebrow>
          <h1 className="text-balance text-4xl font-semibold leading-tight tracking-tight sm:text-5xl">
            The operator copilot for hospitality.
          </h1>
          <p className="text-pretty text-lg leading-relaxed text-muted-foreground">
            Independent hospitality operators run the business hands-on. They own the P&amp;L
            conversation daily, not weekly. They want last night’s margin this morning, the right
            SOP without leaving chat, and the supplier’s number without scrolling WhatsApp. gm-ai is
            the one place to ask.
          </p>
        </Container>
      </section>

      <section className="py-20 sm:py-24">
        <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr]">
          <SectionHeading eyebrow="What we believe" title="Four commitments we don’t drift from." />
          <div className="grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
            {PRINCIPLES.map((item) => (
              <div key={item.title} className="flex flex-col gap-3 bg-card p-7">
                <h3 className="font-medium">{item.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <section className="border-t border-border py-20 sm:py-24">
        <Container className="flex flex-col gap-12">
          <SectionHeading
            eyebrow="Why now"
            title="The category is empty, and the data says the shape fits."
            lede="Checklist tools, POS-native BI and back-office cost control are all real. But none of them ship a daily P&L answer, SOP retrieval and in-chat capture in one place. Hospitality has the point tools; it has no AI-ops layer that ties them together."
          />
          <div className="grid gap-6 sm:grid-cols-3">
            {[
              {
                stat: '586',
                label:
                  'messages in 19 days from one operator. Early, but strong evidence the shape fits.',
              },
              {
                stat: 'Day one',
                label:
                  'venue-shaped: the classifier and starter library are tuned to real hospitality document types.',
              },
              {
                stat: 'Empty',
                label:
                  'hospitality has BI and back-office cost control, but no AI-ops layer that sits across all of it.',
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex flex-col gap-2 rounded-xl border border-border bg-card p-6"
              >
                <span className="text-2xl font-semibold tracking-tight">{item.stat}</span>
                <span className="text-sm leading-relaxed text-muted-foreground">{item.label}</span>
              </div>
            ))}
          </div>
        </Container>
      </section>

      <CtaBand
        title="See yourself in this?"
        subtitle="If you run a bar, restaurant, pub or hotel, gm-ai was built for your day. Start free and connect your POS."
      />
    </>
  )
}
