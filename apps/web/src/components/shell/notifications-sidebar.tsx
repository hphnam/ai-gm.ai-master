'use client'

import { X } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Sheet, SheetClose, SheetContent, SheetTitle } from '@/components/ui/sheet'
import { useConversations } from '@/lib/hooks/use-conversations'
import { useIsMobile } from '@/lib/hooks/use-is-mobile'
import { useUnreadNotificationsCount } from '@/lib/hooks/use-notifications'
import { cn } from '@/lib/utils'
import { AlertsView } from './alerts-view'
import { ConversationsView } from './conversations-view'
import type { InboxFocus } from './inbox-provider'

type SidebarTab = 'conversations' | 'alerts'

export function NotificationsSidebar({
  open,
  onOpenChange,
  focus,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  focus?: InboxFocus | null
}) {
  // Default to Conversations — it's the day-to-day surface. Alerts is the
  // "your scheduled report / compliance reminder" backwater.
  const [tab, setTab] = useState<SidebarTab>('conversations')

  // Reset to Conversations whenever the sheet closes so the next open lands
  // on the primary tab rather than the previous Alerts state.
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => setTab('conversations'), 200)
      return () => clearTimeout(t)
    }
  }, [open])

  // A focus (toast "View" click or /notes/:id deep link) picks the tab: alert
  // notifications live in Alerts; chat notes open their conversation thread.
  useEffect(() => {
    if (open && focus) setTab(focus.kind === 'thread' ? 'conversations' : 'alerts')
  }, [open, focus])

  const isMobile = useIsMobile()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className={cn(
          'gap-0 p-0 sm:max-w-[440px]',
          isMobile && 'h-[85dvh] pb-[env(safe-area-inset-bottom)]',
        )}
        side={isMobile ? 'bottom' : 'right'}
        hideCloseButton
        onOpenAutoFocus={(e) => {
          // Skip auto-focus so the search input doesn't pop a mobile keyboard
          // when the user just wants to glance at the list.
          e.preventDefault()
        }}
      >
        <SheetTitle className="sr-only">Inbox</SheetTitle>
        <SidebarHeader />
        <SidebarTabs tab={tab} onTabChange={setTab} />
        {tab === 'conversations' ? (
          <ConversationsView
            initialOtherUserId={focus?.kind === 'thread' ? focus.otherUserId : null}
          />
        ) : (
          <AlertsView focusId={focus?.kind === 'alert' ? focus.id : null} />
        )}
      </SheetContent>
    </Sheet>
  )
}

function SidebarHeader() {
  return (
    <div className="flex items-center justify-between border-b border-[var(--hairline)] px-4 py-3">
      <h2 className="font-bold text-base text-foreground tracking-[-0.01em]">Inbox</h2>
      <SheetClose
        className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-lg text-[var(--mono-muted)] transition-colors hover:bg-[var(--paper-2)] hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        aria-label="Close"
      >
        <X className="h-5 w-5" aria-hidden />
      </SheetClose>
    </div>
  )
}

function SidebarTabs({
  tab,
  onTabChange,
}: {
  tab: SidebarTab
  onTabChange: (t: SidebarTab) => void
}) {
  // Per-tab unread badges from real counts: conversations = sum of each
  // thread's unread; alerts = total unread minus conversation unread (chat
  // notes and alert notes share the one unread-count endpoint). Clamped and
  // left undefined until both operands load, so the badge only shows on real
  // data and never renders a fabricated or negative number.
  const { data: convData } = useConversations()
  const { data: countData } = useUnreadNotificationsCount()
  const convosUnread = convData
    ? convData.conversations.reduce((n, c) => n + c.unreadCount, 0)
    : undefined
  const totalUnread = countData?.count
  const alertsUnread =
    totalUnread != null && convosUnread != null
      ? Math.max(0, totalUnread - convosUnread)
      : undefined
  return (
    <div className="border-b border-[var(--hairline)] px-4 py-3">
      <div
        className="flex gap-[3px] rounded-[10px] bg-[var(--paper-2)] p-[3px]"
        role="tablist"
        aria-label="Conversations or alerts"
      >
        <Tab
          active={tab === 'conversations'}
          onClick={() => onTabChange('conversations')}
          label="Conversations"
          count={convosUnread}
        />
        <Tab
          active={tab === 'alerts'}
          onClick={() => onTabChange('alerts')}
          label="Alerts"
          count={alertsUnread}
        />
      </div>
    </div>
  )
}

function Tab({
  active,
  onClick,
  label,
  count,
}: {
  active: boolean
  onClick: () => void
  label: string
  count?: number
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'inline-flex min-h-9 flex-1 cursor-pointer items-center justify-center gap-[7px] rounded-[7px] px-3 py-2 text-xs transition-colors',
        active
          ? 'bg-[var(--ledger-card)] font-semibold text-foreground shadow-[0_1px_2px_rgba(32,26,18,0.06)]'
          : 'font-medium text-[var(--ink-muted)] hover:text-foreground',
      )}
    >
      {label}
      {count != null && count > 0 ? (
        <span
          className={cn(
            'font-mono-ledger text-[11px] font-semibold leading-none',
            active ? 'text-[var(--brass)]' : 'text-[var(--ink-faint)]',
          )}
        >
          {count > 99 ? '99+' : count}
        </span>
      ) : null}
    </button>
  )
}
