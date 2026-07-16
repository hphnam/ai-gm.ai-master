'use client'

import { useQueryClient } from '@tanstack/react-query'
import { Bell, CheckSquare, LayoutGrid, type LucideIcon, Menu, MessageSquare } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCurrentMember } from '@/lib/hooks/use-current-member'
import { useUnreadNotificationsCount } from '@/lib/hooks/use-notifications'
import { useOpenTasksCount } from '@/lib/hooks/use-tasks'
import { prefetchRoute } from '@/lib/prefetch'
import { cn } from '@/lib/utils'
import { matchesMoreDestination } from './mobile-more-sheet'

/// Role-gated bottom tab bar (md:hidden), Publican's Ledger styling.
/// staff → Ask · Tasks · Alerts. manager/owner → Today · Ask · Tasks · Alerts ·
/// More. The account/settings surface for staff lives behind the top-bar avatar
/// (also the More sheet), so staff keep a clean three-tab bar.
export function MobileTabBar({ onOpenMore }: { onOpenMore: () => void }) {
  const pathname = usePathname() ?? '/'
  const { isStaff, isLoading } = useCurrentMember()

  const tasksOpen = useOpenTasksCount().data?.openCount ?? 0
  const unread = useUnreadNotificationsCount().data?.count ?? 0

  // Hold the bar until the role resolves so a staff user doesn't flash the
  // five-tab manager layout (role null → isStaff false) on first paint.
  if (isLoading) {
    return <nav aria-label="Primary" className="min-h-[64px] shrink-0 md:hidden" />
  }

  return (
    <nav
      aria-label="Primary"
      className="flex shrink-0 items-stretch border-t border-[var(--hairline)] bg-[var(--paper-2)] px-1.5 pt-2 pb-[calc(env(safe-area-inset-bottom)+8px)] shadow-[0_-1px_14px_-8px_rgba(32,26,18,0.4)] md:hidden"
    >
      {!isStaff ? (
        <TabLink
          href="/today"
          icon={LayoutGrid}
          label="Today"
          active={pathname.startsWith('/today')}
        />
      ) : null}
      <TabLink
        href="/chat"
        icon={MessageSquare}
        label="Ask"
        active={pathname.startsWith('/chat')}
      />
      <TabLink
        href="/tasks"
        icon={CheckSquare}
        label="Tasks"
        active={pathname.startsWith('/tasks')}
        badge={tasksOpen}
      />
      <TabLink
        href="/alerts"
        icon={Bell}
        label="Alerts"
        active={pathname.startsWith('/alerts')}
        badge={unread}
      />
      {!isStaff ? (
        <TabButton
          icon={Menu}
          label="More"
          active={matchesMoreDestination(pathname)}
          onClick={onOpenMore}
        />
      ) : null}
    </nav>
  )
}

type TabVisualProps = {
  icon: LucideIcon
  label: string
  active: boolean
  badge?: number
}

function TabLink({ href, ...rest }: TabVisualProps & { href: string }) {
  const queryClient = useQueryClient()
  return (
    <Link
      href={href}
      onPointerDown={() => prefetchRoute(queryClient, href)}
      className={tabClass}
      aria-current={rest.active ? 'page' : undefined}
    >
      <TabInner {...rest} />
    </Link>
  )
}

function TabButton({ onClick, ...rest }: TabVisualProps & { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={tabClass} aria-haspopup="dialog">
      <TabInner {...rest} />
    </button>
  )
}

function TabInner({ icon: Icon, label, active, badge }: TabVisualProps) {
  const showBadge = (badge ?? 0) > 0
  return (
    <>
      <span className="relative grid place-items-center">
        <Icon
          className={cn(
            'h-[22px] w-[22px]',
            active ? 'text-[var(--brass)]' : 'text-[var(--mono-muted)]',
          )}
          strokeWidth={1.6}
          aria-hidden
        />
        {showBadge ? (
          <span className="font-mono-ledger absolute -top-1.5 -right-2 inline-flex h-[15px] min-w-[15px] items-center justify-center rounded-full border-[1.5px] border-[var(--paper-2)] bg-[var(--clay)] px-1 text-[8.5px] font-bold leading-none text-[var(--cream-hi)]">
            {(badge ?? 0) > 99 ? '99+' : badge}
          </span>
        ) : null}
      </span>
      <span
        className={cn(
          'text-[10px] leading-none tracking-[0.2px]',
          active ? 'font-semibold text-[var(--brass)]' : 'font-medium text-[var(--mono-muted)]',
        )}
      >
        {label}
      </span>
    </>
  )
}

const tabClass = cn(
  'flex min-h-[52px] flex-1 cursor-pointer flex-col items-center justify-center gap-[5px] px-0.5 py-1',
  'transition-transform active:scale-95 motion-reduce:transition-none motion-reduce:active:scale-100',
)
