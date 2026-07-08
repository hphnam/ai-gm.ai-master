'use client'

import { Bell } from 'lucide-react'
import { useCallback } from 'react'
import { toast } from 'sonner'
import { useUnreadNotificationsCount } from '@/lib/hooks/use-notifications'
import { useNotificationsSocket } from '@/lib/hooks/use-notifications-socket'
import { cn } from '@/lib/utils'
import { useInbox } from './inbox-provider'
import { NotificationsSidebar } from './notifications-sidebar'

const TOAST_BODY_PREVIEW_CHARS = 140

export function NotificationsBell() {
  const { open, focus, openInbox, setOpen } = useInbox()
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
    <>
      <button
        type="button"
        onClick={() => openInbox()}
        className={cn(
          'relative inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-md transition-colors',
          'text-muted-foreground hover:bg-muted hover:text-foreground',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
        )}
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Bell className="h-5 w-5" aria-hidden />
        {unread > 0 ? (
          <span
            className={cn(
              'absolute top-1 right-1 inline-flex h-4 min-w-[1rem] items-center justify-center',
              'rounded-full bg-foreground px-1 text-[10px] font-semibold leading-none text-background',
            )}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </button>

      <NotificationsSidebar open={open} onOpenChange={setOpen} focus={focus} />
    </>
  )
}
