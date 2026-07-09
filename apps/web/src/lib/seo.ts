import type { Metadata } from 'next'

// Public marketing origin. Override per environment with NEXT_PUBLIC_SITE_URL;
// the default matches the contact domain used across the marketing site.
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ai-gm.ai'

export const SITE_NAME = 'AI-GM'

// Per-page metadata for the marketing site. Sets a canonical URL and mirrors
// the title/description into OpenGraph + Twitter so shares render correctly.
// Title is the bare page name; the root layout's template appends the brand.
export function pageMetadata({
  title,
  description,
  path,
}: {
  title: string
  description: string
  path: string
}): Metadata {
  const url = path === '/' ? SITE_URL : `${SITE_URL}${path}`
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: 'website',
      siteName: SITE_NAME,
      url,
      title,
      description,
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}
