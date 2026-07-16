'use client'

import { MessageSquare } from 'lucide-react'
import { AlertsView } from '@/components/shell/alerts/alerts-view'
import { useInbox } from '@/components/shell/inbox-provider'
import { useUnreadNotificationsCount } from '@/lib/hooks/use-notifications'

/// Full-screen Alerts tab. The person-to-person Conversations surface stays in
/// the inbox sheet (deep links + the "Messages" button) so nothing is dropped.
export function AlertsBody() {
  const { openInbox } = useInbox()
  const unread = useUnreadNotificationsCount().data?.count ?? 0

  return (
    <div className="scrollbar-thin flex flex-1 flex-col overflow-y-auto">
      <div className="flex items-end justify-between px-5 pt-4 pb-3 sm:px-7">
        <div>
          <p className="mb-1.5 font-mono-ledger text-[11px] font-semibold uppercase tracking-[1.6px] text-[var(--mono-muted)]">
            {unread > 0 ? `${unread} new` : 'All caught up'}
          </p>
          <h1 className="font-news text-[28px] leading-[1.15] font-normal tracking-[-0.01em] text-[var(--ink-text)]">
            Alerts
          </h1>
        </div>
        <button
          type="button"
          onClick={() => openInbox()}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-[var(--hairline)] bg-[var(--paper-2)] px-3 py-1.5 text-[12.5px] font-medium text-[var(--ink-muted)] active:scale-95 transition-transform"
        >
          <MessageSquare className="h-3.5 w-3.5" aria-hidden />
          Messages
        </button>
      </div>
      <AlertsView focusId={null} />
    </div>
  )
}
