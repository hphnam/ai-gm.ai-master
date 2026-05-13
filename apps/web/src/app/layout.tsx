import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { NuqsAdapter } from 'nuqs/adapters/next/app'
import { QueryProvider } from '@/components/providers/query-provider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-jakarta',
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
      className={`${jakarta.variable} light`}
      style={{ colorScheme: 'light' }}
    >
      <body className="font-sans">
        <NuqsAdapter>
          <QueryProvider>
            {children}
            <Toaster position="top-right" richColors closeButton visibleToasts={3} />
          </QueryProvider>
        </NuqsAdapter>
      </body>
    </html>
  )
}
