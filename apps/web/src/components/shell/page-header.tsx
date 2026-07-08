'use client'

import { Menu } from 'lucide-react'
import { useCurrentMember } from '@/lib/hooks/use-current-member'
import { cn } from '@/lib/utils'
import { useAppShell } from './app-shell'
import { MobileMoreMenu } from './mobile-more-menu'
import { NotificationsBell } from './notifications-bell'

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
        // inline before the bell. This keeps the title from being squashed by
        // action controls on narrow screens.
        'flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3 sm:flex-nowrap sm:px-6',
        border && 'border-b border-border',
      )}
    >
      <button
        type="button"
        onClick={openMobileSidebar}
        aria-label="Open sidebar"
        className={cn(
          'order-1 -ml-2 inline-flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground hover:bg-muted md:hidden',
          // Hide until the role resolves — a staff user momentarily reads as a
          // manager (role null → isStaff false) and would otherwise flash a
          // tappable sidebar toggle they shouldn't have.
          (isStaff || isLoading) && 'hidden',
        )}
      >
        <Menu className="h-5 w-5" />
      </button>
      <div className="order-1 flex min-w-0 flex-1 flex-col">
        <h1 className="truncate font-display text-xl font-semibold leading-tight tracking-tight text-foreground">
          {title}
        </h1>
        {description ? (
          <p className="mt-0.5 truncate text-xs text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {/* Top-right nav sits with the title on mobile: staff have no sidebar so
          they get the more-menu; everyone else gets the bell. Held back until
          the role resolves so staff never flash the manager affordance. */}
      {isLoading ? null : (
        <div className="order-2 flex shrink-0 items-center gap-1 sm:order-3">
          <span className={cn(isStaff && 'hidden md:inline-flex')}>
            <NotificationsBell />
          </span>
          {isStaff ? (
            <span className="md:hidden">
              <MobileMoreMenu />
            </span>
          ) : null}
        </div>
      )}
      {actions ? (
        <div className="order-3 flex w-full items-center gap-2 sm:order-2 sm:w-auto sm:ml-auto">
          {actions}
        </div>
      ) : null}
    </header>
  )
}
