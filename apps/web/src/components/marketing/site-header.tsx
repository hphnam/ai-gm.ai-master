'use client'

import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useSession } from '@/lib/auth-client'
import { cn } from '@/lib/utils'
import { NAV_LINKS } from './site-nav'
import { Wordmark } from './wordmark'

export function SiteHeader() {
  const pathname = usePathname()
  // Client-side session read keeps every marketing page statically cacheable.
  // Until it resolves, visitors see the logged-out CTA (the common case); it
  // swaps to "Open app" once a session is confirmed.
  const { data: session } = useSession()
  const isAuthed = Boolean(session)
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Close the mobile sheet on navigation.
  useEffect(() => setOpen(false), [pathname])

  return (
    <header className="sticky top-0 z-50 px-4 pt-3 sm:px-6 sm:pt-4">
      <div
        className={cn(
          'relative mx-auto flex h-14 max-w-5xl items-center justify-between rounded-full pl-5 pr-2.5 transition-all duration-300 ease-out',
          // Liquid glass: translucent fill, deep blur + saturation, a hairline
          // border and an inset top highlight that catches "light" like glass.
          scrolled || open
            ? 'border border-border/70 bg-background/55 shadow-[0_8px_32px_-12px_rgb(0_0_0/0.22),inset_0_1px_0_0_rgb(255_255_255/0.55)] backdrop-blur-xl backdrop-saturate-150 dark:bg-background/45 dark:shadow-[0_8px_32px_-12px_rgb(0_0_0/0.6),inset_0_1px_0_0_rgb(255_255_255/0.08)]'
            : 'border border-transparent bg-transparent',
        )}
      >
        <Link href="/" className="flex items-center gap-2" aria-label="gm-ai home">
          <Wordmark />
          {/* "Live" pulse — signals the assistant is awake and answering, the
              same one streaming a reply in the hero below. */}
          <span className="relative flex size-1.5" aria-hidden>
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--chart-1)] opacity-70 motion-reduce:hidden" />
            <span className="relative inline-flex size-1.5 rounded-full bg-[var(--chart-1)]" />
          </span>
        </Link>

        <nav
          className="hidden items-center gap-0.5 md:flex md:absolute md:left-1/2 md:-translate-x-1/2"
          aria-label="Primary"
        >
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'rounded-full px-3.5 py-1.5 text-sm transition-colors',
                  active
                    ? 'bg-foreground/[0.06] text-foreground dark:bg-foreground/10'
                    : 'text-muted-foreground hover:bg-foreground/[0.04] hover:text-foreground dark:hover:bg-foreground/[0.06]',
                )}
              >
                {link.label}
              </Link>
            )
          })}
        </nav>

        <div className="hidden items-center gap-1.5 md:flex">
          {isAuthed ? (
            <Button asChild size="sm" className="rounded-full">
              <Link href="/chat">Open app</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm" className="rounded-full">
                <Link href="/auth/sign-in">Sign in</Link>
              </Button>
              <Button asChild size="sm" className="rounded-full">
                <Link href="/auth/sign-up">Start free trial</Link>
              </Button>
            </>
          )}
        </div>

        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-foreground/[0.06] md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open && (
        <div className="mx-auto mt-2 max-w-5xl rounded-3xl border border-border/70 bg-background/70 shadow-[0_8px_32px_-12px_rgb(0_0_0/0.22),inset_0_1px_0_0_rgb(255_255_255/0.55)] backdrop-blur-xl backdrop-saturate-150 md:hidden dark:bg-background/55 dark:shadow-[0_8px_32px_-12px_rgb(0_0_0/0.6),inset_0_1px_0_0_rgb(255_255_255/0.08)]">
          <nav className="flex flex-col gap-1 p-3" aria-label="Mobile">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl px-3 py-2.5 text-sm text-foreground transition-colors hover:bg-foreground/[0.06]"
              >
                {link.label}
              </Link>
            ))}
            <div className="mt-2 flex flex-col gap-2 border-t border-border/70 pt-3">
              {isAuthed ? (
                <Button asChild className="rounded-full">
                  <Link href="/chat">Open app</Link>
                </Button>
              ) : (
                <>
                  <Button asChild variant="outline" className="rounded-full">
                    <Link href="/auth/sign-in">Sign in</Link>
                  </Button>
                  <Button asChild className="rounded-full">
                    <Link href="/auth/sign-up">Start free trial</Link>
                  </Button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
