'use client'

import { CheckCheck } from 'lucide-react'
import { toast } from 'sonner'
import { useMarkAllNotificationsRead } from '@/lib/hooks/use-notifications'
import { apiErrorLabel } from '../notifications-shared'

export function AlertsHeader() {
  const markAllRead = useMarkAllNotificationsRead()
  return (
    <div className="flex items-center justify-end gap-1 border-b border-[var(--hairline)] px-4 py-2">
      <button
        type="button"
        onClick={() =>
          markAllRead.mutate(undefined, {
            onSuccess: (res) => {
              if (res.updated > 0) {
                toast.success(
                  res.updated === 1
                    ? '1 notification marked read'
                    : `${res.updated} notifications marked read`,
                )
              }
            },
            onError: (err) => toast.error(`Couldn't mark all read: ${apiErrorLabel(err)}`),
          })
        }
        disabled={markAllRead.isPending}
        className="inline-flex h-7 cursor-pointer items-center gap-1 rounded-md px-2 text-[var(--ink-muted)] text-xs transition-colors hover:bg-[var(--paper-2)] hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
        title="Mark all as read"
      >
        <CheckCheck className="h-3.5 w-3.5" aria-hidden />
        <span className="hidden sm:inline">Mark all read</span>
      </button>
    </div>
  )
}
