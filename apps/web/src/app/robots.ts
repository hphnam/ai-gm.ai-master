import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

// The authenticated app surface and onboarding flows carry no public value and
// shouldn't be crawled. Everything else (the marketing site) is open.
const DISALLOWED = [
  '/chat',
  '/tasks',
  '/docs',
  '/compliance',
  '/reports',
  '/dashboard',
  '/incidents',
  '/settings',
  '/welcome',
  '/onboard',
  '/venues',
  '/debug',
  '/auth',
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: DISALLOWED },
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
