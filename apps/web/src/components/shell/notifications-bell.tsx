'use client'

import { Bell } from 'lucide-react'
import { useCallback } from 'react'
import { toast } from 'sonner'
import { useUnreadNotificationsCount } from '@/lib/hooks/use-notifications'
import { useNotificationsSocket } from '@/lib/hooks/use-notifications-socket'
import { cn } from '@/lib/utils'
import { useInbox } from './inbox-provider'

const TOAST_BODY_PREVIEW_CHARS = 140

export function NotificationsBell() {
  // The inbox sheet is mounted once at the shell root (InboxSheetHost); the bell
  // just triggers it via InboxProvider so there's a single sheet instance.
  const { open, openInbox } = useInbox()
  const { data: countData } = useUnreadNotificationsCount()

  const unread = countData?.count ?? 0

  useNotificationsSocket({
    onCreated: useCallback(
      (payload) => {
        // Toast title matches the sidebar row treatment — automated rows
        // are framed as gm reminders, not "Elliot Horner sent you a note".
        const authorName = payload.author?.name ?? payload.author?.email
        const who = payload.automated
          ? authorName
            ? `gm · ${payload.category === 'task' ? 'task by' : 'set up by'} ${authorName}`
            : 'gm'
          : (authorName ?? 'New notification')
        const preview =
          payload.body.length > TOAST_BODY_PREVIEW_CHARS
            ? `${payload.body.slice(0, TOAST_BODY_PREVIEW_CHARS).trimEnd()}…`
            : payload.body
        toast.message(who, {
          description: preview,
          action: {
            label: 'View',
            onClick: () => openInbox({ kind: 'alert', id: payload.id }),
          },
        })
      },
      [openInbox],
    ),
  })

  return (
    <button
      type="button"
      onClick={() => openInbox()}
      className={cn(
        'relative inline-flex h-[30px] w-[30px] cursor-pointer items-center justify-center rounded-lg transition-colors',
        'text-[var(--ink-muted)] hover:bg-black/5 hover:text-[var(--ink-text)]',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brass)]/40',
      )}
      aria-label={unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
      aria-haspopup="dialog"
      aria-expanded={open}
    >
      <Bell className="h-[17px] w-[17px]" aria-hidden />
      {unread > 0 ? (
        <span
          className={cn(
            'font-mono-ledger absolute top-0.5 right-0.5 inline-flex h-[15px] min-w-[15px] items-center justify-center',
            'rounded-full border-[1.5px] border-[var(--paper-2)] bg-[var(--clay)] px-1 text-[9px] font-bold leading-none text-[var(--cream-hi)]',
          )}
        >
          {unread > 99 ? '99+' : unread}
        </span>
      ) : null}
    </button>
  )
}
