import Link from 'next/link'
import type { ReactNode } from 'react'
import { PageContainer } from '@/components/ui/page-container'

export function OnboardingShell({ header, children }: { header: ReactNode; children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="border-b border-border/60">
        <div className="mx-auto flex w-full max-w-2xl items-center justify-between gap-4 px-4 py-2 sm:px-6">
          <Link
            href="/chat"
            aria-label="GM AI"
            className="group inline-flex min-h-11 items-center rounded-sm transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            <span className="inline-flex items-baseline gap-1.5 font-display text-foreground">
              <span className="text-lg font-semibold leading-none tracking-[-0.02em]">gm</span>
              <span
                aria-hidden
                className="inline-block h-1 w-1 translate-y-[-0.15em] rounded-full bg-foreground/40"
              />
              <span className="text-xs font-medium uppercase leading-none tracking-[0.22em] text-foreground/55">
                ai
              </span>
            </span>
          </Link>
          <div className="min-w-0 flex-1">{header}</div>
        </div>
      </header>
      <main className="flex-1 pb-[env(safe-area-inset-bottom)]">
        <PageContainer className="max-w-2xl py-8 sm:py-12">{children}</PageContainer>
      </main>
    </div>
  )
}
