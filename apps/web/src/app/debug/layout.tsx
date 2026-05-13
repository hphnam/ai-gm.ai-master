import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Debug',
  robots: { index: false, follow: false },
}

export default function DebugLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      <div
        role="note"
        className="bg-amber-100 text-amber-900 text-xs p-2 text-center border-b border-amber-300"
      >
        Debug surface — not intended for non-operators. URLs may expose conversation provenance; do
        not bookmark or screenshot-share.
      </div>
      {children}
    </div>
  )
}
