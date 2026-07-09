import type { Metadata, Viewport } from 'next'
import { Geist } from 'next/font/google'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { QueryProvider } from '@/components/providers/query-provider'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { SITE_NAME, SITE_URL } from '@/lib/seo'
import './globals.css'

// Single-font system. Geist Sans handles UI, body, and display sizes; weight
// and tracking do the hierarchy work. Closest free analog to Camera Plain /
// the Vercel-Linear-Supabase aesthetic.
const geist = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist',
  weight: ['400', '500', '600', '700'],
})

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'AI-GM — the AI operator for hospitality',
    template: `%s · ${SITE_NAME}`,
  },
  description: 'A general manager in a chat box for hospitality operations',
  applicationName: SITE_NAME,
  appleWebApp: { capable: true, statusBarStyle: 'default', title: SITE_NAME },
  // Stop mobile browsers auto-linkifying phone numbers into <a href="tel:"> — it
  // mutates the DOM post-render and triggers hydration mismatches (onboard page).
  formatDetection: { telephone: false },
}

// maximum-scale=1 stops iOS Safari auto-zooming when a sub-16px input is
// focused. user-scalable is left ON, so iOS still honours pinch-to-zoom (it
// ignores maximum-scale for user-initiated zoom since iOS 10). We can't fix
// this via input font-size because the shadcn inputs carry Tailwind's `text-sm`
// utility, which outranks a base-layer rule.
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#f8f6f3',
  // Extend the canvas under the iOS home-indicator / notch so the bottom bars
  // can paint their background into the safe-area inset (via env()). Without
  // this the inset resolves to 0 and iOS fills the strip with a mismatched
  // colour under the composer / tab bar.
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geist.variable} light`}
      style={{ colorScheme: 'light' }}
    >
      <body className="font-sans">
        <NuqsAdapter>
          <QueryProvider>
            <TooltipProvider delayDuration={200} skipDelayDuration={300}>
              {children}
            </TooltipProvider>
            <Toaster position="top-right" closeButton visibleToasts={3} />
          </QueryProvider>
        </NuqsAdapter>
      </body>
    </html>
  )
}
