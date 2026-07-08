import type { Metadata } from 'next'
import { Container, Eyebrow } from '@/components/marketing/primitives'
import { pageMetadata } from '@/lib/seo'

export const metadata: Metadata = pageMetadata({
  title: 'Privacy',
  description: 'How gm-ai handles your venue’s data.',
  path: '/privacy',
})

export default function PrivacyPage() {
  return (
    <section className="py-16 sm:py-20">
      <Container className="flex max-w-2xl flex-col gap-5">
        <Eyebrow>Legal</Eyebrow>
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">Privacy</h1>
        <p className="text-muted-foreground">
          Your POS data and documents are used to answer your questions, scoped to your
          organisation. We don’t train models on your venue’s data, and we don’t sell it. A full
          privacy policy will be published before general availability. Until then, reach us at{' '}
          <a className="text-foreground underline underline-offset-4" href="mailto:hello@gm-ai.app">
            hello@gm-ai.app
          </a>{' '}
          with any data questions.
        </p>
      </Container>
    </section>
  )
}
