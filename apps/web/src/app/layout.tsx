import type { Metadata } from 'next'
import { Geist } from 'next/font/google'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { QueryProvider } from '@/components/providers/query-provider'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
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
  title: 'GM AI',
  description: 'General Manager AI for hospitality operations',
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
