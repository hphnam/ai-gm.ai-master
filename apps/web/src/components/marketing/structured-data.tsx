import { SITE_NAME, SITE_URL } from '@/lib/seo'

// Organization + product structured data for the home page. Rendered as a
// JSON-LD script so search engines can attribute the brand and the SaaS offer.
const GRAPH = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      description:
        'AI operator copilot for hospitality: connect your POS, accounting and calendar to your venue’s own SOPs and ask anything in one chat.',
    },
    {
      '@type': 'SoftwareApplication',
      name: SITE_NAME,
      applicationCategory: 'BusinessApplication',
      operatingSystem: 'Web',
      url: SITE_URL,
      publisher: { '@id': `${SITE_URL}/#organization` },
      offers: {
        '@type': 'Offer',
        price: '69',
        priceCurrency: 'GBP',
        description: 'Per venue, per month. 14-day free trial.',
      },
    },
  ],
}

export function StructuredData() {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(GRAPH) }}
    />
  )
}
