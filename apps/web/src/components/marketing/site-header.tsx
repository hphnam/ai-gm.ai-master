'use client'

import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
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

  // Close the mobile sheet on navigation.
  useEffect(() => setOpen(false), [pathname])

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--hairline)] bg-[rgba(245,239,227,0.86)] backdrop-blur-[12px]">
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-6 px-7 py-3.5">
        <Link href="/" aria-label="AI-GM home">
          <Wordmark />
        </Link>

        <nav
          className="hidden items-center gap-7 text-[13.5px] font-medium md:flex"
          aria-label="Primary"
        >
          {NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'transition-colors hover:text-[var(--ink-text)]',
                  active ? 'text-[var(--ink-text)]' : 'text-[var(--ink-muted)]',
                )}
              >
                {link.label}
              </Link>
            )
          })}
          {isAuthed ? (
            <Link
              href="/chat"
              className="rounded-[5px] bg-[var(--ink-text)] px-[18px] py-2.5 font-semibold text-[var(--cream-hi)] transition-colors hover:bg-[var(--brass)]"
            >
              Open app
            </Link>
          ) : (
            <Link
              href="/auth/sign-up"
              className="rounded-[5px] bg-[var(--ink-text)] px-[18px] py-2.5 font-semibold text-[var(--cream-hi)] transition-colors hover:bg-[var(--brass)]"
            >
              Start free trial
            </Link>
          )}
        </nav>

        <button
          type="button"
          className="-mr-1 inline-flex size-11 items-center justify-center rounded-full text-[var(--ink-text)] transition-colors hover:bg-[rgba(32,26,18,0.06)] md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      {open ? (
        <nav
          className="border-t border-[var(--hairline)] bg-[var(--paper)] px-7 py-4 md:hidden"
          aria-label="Mobile"
        >
          <div className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-lg px-3 py-2.5 text-[15px] text-[var(--ink-text)] transition-colors hover:bg-[rgba(32,26,18,0.06)]"
              >
                {link.label}
              </Link>
            ))}
            <Link
              href={isAuthed ? '/chat' : '/auth/sign-up'}
              className="mt-2 rounded-md bg-[var(--brass)] px-4 py-3 text-center text-[15px] font-semibold text-[var(--cream-hi)] shadow-[0_2px_0_var(--brass-shadow)]"
            >
              {isAuthed ? 'Open app' : 'Start free trial'}
            </Link>
          </div>
        </nav>
      ) : null}
    </header>
  )
}
