import Link from 'next/link'
import type { ReactNode } from 'react'

export function OnboardingShell({ header, children }: { header: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Link
            href="/chat"
            aria-label="GM AI"
            className="group inline-flex items-baseline gap-1.5 font-display text-foreground transition-opacity hover:opacity-80"
          >
            <span className="text-lg font-semibold leading-none tracking-[-0.02em]">gm</span>
            <span
              aria-hidden
              className="inline-block h-1 w-1 translate-y-[-0.15em] rounded-full bg-foreground/40"
            />
            <span className="text-[10px] font-medium uppercase leading-none tracking-[0.22em] text-foreground/55">
              ai
            </span>
          </Link>
          <div className="min-w-0 flex-1">{header}</div>
        </div>
      </header>
      <main className="flex-1">
        <div className="mx-auto w-full max-w-2xl px-4 py-8 sm:px-6 sm:py-12">{children}</div>
      </main>
    </div>
  )
}
