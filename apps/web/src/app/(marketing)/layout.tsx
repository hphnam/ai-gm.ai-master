import { Archivo, Newsreader, Spline_Sans_Mono } from 'next/font/google'
import type { ReactNode } from 'react'
import { SiteFooter } from '@/components/marketing/site-footer'
import { SiteHeader } from '@/components/marketing/site-header'

// "Publican's Ledger" type system. Newsreader carries every display headline
// and italic accent; Archivo does body/UI/wordmark; Spline Sans Mono sets all
// figures, ledger tables and citation chips. Scoped to the marketing wrapper
// via CSS vars so the app surface keeps its own single-font system.
const newsreader = Newsreader({
  subsets: ['latin'],
  display: 'swap',
  style: ['normal', 'italic'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-newsreader',
})

const archivo = Archivo({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-archivo',
})

const splineMono = Spline_Sans_Mono({
  subsets: ['latin'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
  variable: '--font-spline-mono',
})

// Public marketing shell. No auth gate and no per-request session fetch — the
// pages stay statically cacheable; the header resolves the "Open app" CTA on
// the client via the better-auth session.
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <div
      className={`ledger-theme ${newsreader.variable} ${archivo.variable} ${splineMono.variable} flex min-h-dvh flex-col`}
    >
      <SiteHeader />
      <main className="flex-1">{children}</main>
      <SiteFooter />
    </div>
  )
}
