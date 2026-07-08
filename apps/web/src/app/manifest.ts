import type { MetadataRoute } from 'next'
import { SITE_NAME } from '@/lib/seo'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — AI operator for hospitality`,
    short_name: SITE_NAME,
    description: 'General Manager AI for hospitality operations',
    start_url: '/chat',
    display: 'standalone',
    background_color: '#f8f6f3',
    theme_color: '#f8f6f3',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  }
}
