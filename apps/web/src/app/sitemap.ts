import type { MetadataRoute } from 'next'
import { POSTS } from '@/components/marketing/posts'
import { SITE_URL } from '@/lib/seo'

// Marketing surface only. The app routes (/chat, /settings, …) are gated and
// noindex via robots, so they're intentionally absent here.
const STATIC_PATHS = ['/', '/features', '/pricing', '/about', '/blog', '/changelog']

export default function sitemap(): MetadataRoute.Sitemap {
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((path) => ({
    url: path === '/' ? SITE_URL : `${SITE_URL}${path}`,
    changeFrequency: path === '/' ? 'weekly' : 'monthly',
    priority: path === '/' ? 1 : 0.7,
  }))

  const postEntries: MetadataRoute.Sitemap = POSTS.map((post) => ({
    url: `${SITE_URL}/blog/${post.slug}`,
    lastModified: post.date,
    changeFrequency: 'yearly',
    priority: 0.5,
  }))

  return [...staticEntries, ...postEntries]
}
