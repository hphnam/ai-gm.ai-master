'use client'

import { Bell, CheckSquare, LayoutDashboard, MessageSquare, MoreHorizontal } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { useCurrentMember } from '@/lib/hooks/use-current-member'
import { useUnreadNotificationsCount } from '@/lib/hooks/use-notifications'
import { useOpenTasksCount } from '@/lib/hooks/use-tasks'
import { cn } from '@/lib/utils'
import { MobileMoreSheet, matchesMoreDestination } from './mobile-more-sheet'
import { NotificationsSidebar } from './notifications-sidebar'

export function MobileTabBar() {
  const pathname = usePathname() ?? '/'
  const [inboxOpen, setInboxOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const { isStaff, isLoading } = useCurrentMember()

  const tasksCounts = useOpenTasksCount().data
  const tasksOpen = tasksCounts?.openCount ?? 0
  const tasksOverdue = (tasksCounts?.overdueCount ?? 0) > 0
  const unread = useUnreadNotificationsCount().data?.count ?? 0

  const chatActive = pathname.startsWith('/chat')
  const tasksActive = pathname.startsWith('/tasks')
  const dashboardActive = pathname.startsWith('/dashboard')

  return (
    <>
      <nav
        aria-label="Primary"
        className="flex min-h-[52px] shrink-0 items-stretch border-t border-border bg-background pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <TabLink href="/chat" icon={MessageSquare} label="Chat" active={chatActive} />
        {!isLoading && !isStaff ? (
          <TabLink
            href="/dashboard"
            icon={LayoutDashboard}
            label="Dashboard"
            active={dashboardActive}
          />
        ) : null}
        <TabLink
          href="/tasks"
          icon={CheckSquare}
          label="Tasks"
          active={tasksActive}
          badge={tasksOpen}
          badgeUrgent={tasksOverdue}
        />
        {isLoading ? null : isStaff ? (
          <TabButton
            icon={Bell}
            label="Notes"
            active={inboxOpen}
            badge={unread}
            badgeUrgent={unread > 0}
            onClick={() => setInboxOpen(true)}
          />
        ) : (
          <TabButton
            icon={MoreHorizontal}
            label="More"
            active={moreOpen || matchesMoreDestination(pathname)}
            onClick={() => setMoreOpen(true)}
          />
        )}
      </nav>
      <NotificationsSidebar open={inboxOpen} onOpenChange={setInboxOpen} />
      <MobileMoreSheet open={moreOpen} onOpenChange={setMoreOpen} pathname={pathname} />
    </>
  )
}

type TabVisualProps = {
  icon: React.ComponentType<{ className?: string }>
  label: string
  active: boolean
  badge?: number
  badgeUrgent?: boolean
}

function TabLink({ href, ...rest }: TabVisualProps & { href: string }) {
  return (
    <Link
      href={href}
      className={tabClass(rest.active)}
      aria-current={rest.active ? 'page' : undefined}
    >
      <TabInner {...rest} />
    </Link>
  )
}

function TabButton({ onClick, ...rest }: TabVisualProps & { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={tabClass(rest.active)}
      aria-haspopup="dialog"
      aria-expanded={rest.active}
    >
      <TabInner {...rest} />
    </button>
  )
}

function TabInner({ icon: Icon, label, active, badge, badgeUrgent }: TabVisualProps) {
  const showBadge = (badge ?? 0) > 0
  return (
    <>
      <span
        className={cn(
          'relative flex h-8 w-16 items-center justify-center rounded-full transition-colors motion-reduce:transition-none',
          active ? 'bg-brand/12 text-brand' : 'text-muted-foreground',
        )}
      >
        <Icon className="h-[22px] w-[22px]" aria-hidden />
        {showBadge ? (
          <span
            className={cn(
              'absolute right-2.5 -top-1 inline-flex min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-semibold leading-4 tabular-nums text-white ring-2 ring-background',
              badgeUrgent ? 'bg-destructive' : 'bg-brand',
            )}
          >
            {(badge ?? 0) > 99 ? '99+' : badge}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          'text-[11px] leading-none',
          active ? 'font-semibold text-brand' : 'font-medium text-muted-foreground',
        )}
      >
        {label}
      </span>
    </>
  )
}

function tabClass(active: boolean): string {
  return cn(
    'flex min-h-[52px] flex-1 cursor-pointer flex-col items-center justify-center gap-1 transition-colors active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100',
    active ? '' : 'hover:text-foreground',
  )
}
