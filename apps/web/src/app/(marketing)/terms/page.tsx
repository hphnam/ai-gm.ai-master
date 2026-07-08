import type { Metadata } from 'next'
import { Container, Eyebrow } from '@/components/marketing/primitives'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Terms',
  description: 'The terms of using gm-ai.',
  path: '/terms',
})

export default function TermsPage() {
  return (
    <section className="py-16 sm:py-20">
      <Container className="flex max-w-2xl flex-col gap-5">
        <Eyebrow>Legal</Eyebrow>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">Terms</h1>
        <p className="text-muted-foreground">
          gm-ai is in active development with a design-partner operator. Full terms of service will
          be published before general availability. During the trial period, the service is provided
          as-is while we build alongside real venues. Questions?{' '}
          <a className="text-foreground underline underline-offset-4" href="mailto:hello@gm-ai.app">
            hello@gm-ai.app
          </a>
          .
        </p>
      </Container>
    </section>
  )
}
