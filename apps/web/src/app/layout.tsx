import type { Metadata } from 'next'
import { QueryProvider } from '@/components/providers/query-provider'
import { Toaster } from '@/components/ui/sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'GM AI',
  description: 'General Manager AI for hospitality operations',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <QueryProvider>
          {children}
          <Toaster
            position="top-right"
            richColors
            closeButton
            visibleToasts={3}
          />
        </QueryProvider>
      </body>
    </html>
  )
}
