'use client'

import { Menu } from 'lucide-react'
import { useCurrentMember } from '@/lib/hooks/use-current-member'
import { cn } from '@/lib/utils'
import { useAppShell } from './app-shell'
import { MobileMoreMenu } from './mobile-more-menu'

type Props = {
  title: string
  description?: string
  actions?: React.ReactNode
  border?: boolean
}

export function PageHeaderView({ title, description, actions, border = true }: Props) {
  const { openMobileSidebar } = useAppShell()
  const { isStaff, isLoading } = useCurrentMember()
  return (
    <header
      className={cn(
        // Mobile: title + nav on row one, actions wrap to a full-width row
        // below (order-3 + w-full). Desktop: everything on one row, actions
        // inline after the title. This keeps the title from being squashed by
        // action controls on narrow screens.
        'flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3.5 sm:flex-nowrap sm:px-7',
        border && 'border-b border-[var(--hairline)]',
      )}
    >
      <button
        type="button"
        onClick={openMobileSidebar}
        aria-label="Open sidebar"
        className={cn(
          'order-1 -ml-2 inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-[var(--ink-muted)] hover:bg-black/5 md:hidden',
          // Hide until the role resolves — a staff user momentarily reads as a
          // manager (role null → isStaff false) and would otherwise flash a
          // tappable sidebar toggle they shouldn't have.
          (isStaff || isLoading) && 'hidden',
        )}
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="order-1 flex min-w-0 flex-1 flex-col">
        <h1 className="truncate font-news text-[21px] font-semibold leading-tight tracking-[-0.01em] text-[var(--ink-text)]">
          {title}
        </h1>
        {description ? (
          <p className="mt-0.5 truncate text-xs text-[var(--mono-muted)]">{description}</p>
        ) : null}
      </div>
      {/* Staff have no sidebar on mobile, so they get the more-menu here. The
          bell now lives in the sidebar (desktop) and the tab bar (mobile). */}
      {isLoading || !isStaff ? null : (
        <div className="order-2 flex shrink-0 items-center gap-1 sm:order-3 md:hidden">
          <MobileMoreMenu />
        </div>
      )}
      {actions ? (
        <div className="order-3 flex w-full items-center gap-2 sm:order-2 sm:ml-auto sm:w-auto">
          {actions}
        </div>
      ) : null}
    </header>
  )
}
