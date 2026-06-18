'use client'

import { Bell } from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { useUnreadNotificationsCount } from '@/lib/hooks/use-notifications'
import { useNotificationsSocket } from '@/lib/hooks/use-notifications-socket'
import { cn } from '@/lib/utils'
import { NotificationsSidebar } from './notifications-sidebar'

const TOAST_BODY_PREVIEW_CHARS = 140

export function NotificationsBell() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [focusId, setFocusId] = useState<string | null>(null)
  const { data: countData } = useUnreadNotificationsCount()

  const unread = countData?.count ?? 0

  const openSidebarFor = useCallback((id: string) => {
    setFocusId(id)
    setSidebarOpen(true)
  }, [])

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
            onClick: () => openSidebarFor(payload.id),
          },
        })
      },
      [openSidebarFor],
    ),
  })

  // Clear focusId after the sidebar closes so re-opening doesn't re-flash.
  useEffect(() => {
    if (!sidebarOpen) {
      const t = setTimeout(() => setFocusId(null), 200)
      return () => clearTimeout(t)
    }
  }, [sidebarOpen])

  return (
    <>
      <button
        type="button"
        onClick={() => setSidebarOpen(true)}
        className={cn(
          'relative inline-flex cursor-pointer items-center justify-center rounded-md p-1.5 transition-colors',
          'text-muted-foreground hover:bg-muted hover:text-foreground',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40',
        )}
        aria-label={unread > 0 ? `Notifications (${unread} unread)` : 'Notifications'}
        aria-haspopup="dialog"
        aria-expanded={sidebarOpen}
      >
        <Bell className="h-4 w-4" aria-hidden />
        {unread > 0 ? (
          <span
            className={cn(
              'absolute -top-0.5 -right-0.5 inline-flex h-4 min-w-[1rem] items-center justify-center',
              'rounded-full bg-foreground px-1 text-[10px] font-semibold leading-none text-background',
            )}
          >
            {unread > 99 ? '99+' : unread}
          </span>
        ) : null}
      </button>

      <NotificationsSidebar open={sidebarOpen} onOpenChange={setSidebarOpen} focusId={focusId} />
    </>
  )
}
