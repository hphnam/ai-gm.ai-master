import type { Metadata } from 'next'
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
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
