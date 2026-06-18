import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  transpilePackages: ['@gm-ai/types'],
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
