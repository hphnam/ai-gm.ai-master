import type { ReactNode } from 'react'
import { SiteFooter } from '@/components/marketing/site-footer'
import { SiteHeader } from '@/components/marketing/site-header'

// Public marketing shell. No auth gate and no per-request session fetch — the
// pages stay statically cacheable; the header resolves the "Open app" CTA on
// the client via the better-auth session. The ledger theme + fonts come from
// the root <body> (applied product-wide), so this wrapper only owns layout.
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  )
}
