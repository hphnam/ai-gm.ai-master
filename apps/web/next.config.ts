import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@gm-ai/types'],
  // Hide the floating Next.js dev indicator badge.
  devIndicators: false,
  // Guarantee per-icon tree-shaking for lucide-react (imported by name across
  // the app) so a page only ships the icons it uses.
  experimental: { optimizePackageImports: ['lucide-react'] },
  async headers() {
    return [
      {
        source: '/debug/:path*',
        headers: [{ key: 'X-Robots-Tag', value: 'noindex, nofollow' }],
      },
    ]
  },
  allowedDevOrigins: ['localhost:3000', 'local.andpro.digital'],
}

export default nextConfig
