'use client'

import { FileText, Info, ListTodo, MessageSquare, ShieldAlert } from 'lucide-react'
import { useEffect, useState } from 'react'
import { ApiError } from '@/lib/api-client'
import type { Notification, NotificationCategory } from '@/lib/hooks/use-notifications'
import { cn } from '@/lib/utils'

const MS_PER_MINUTE = 60_000
const MS_PER_HOUR = 60 * MS_PER_MINUTE
const MS_PER_DAY = 24 * MS_PER_HOUR

export function formatRelative(iso: string, now = Date.now()): string {
  const t = new Date(iso).getTime()
  const diff = Math.max(0, now - t)
  if (diff < MS_PER_MINUTE) return 'just now'
  if (diff < MS_PER_HOUR) return `${Math.floor(diff / MS_PER_MINUTE)}m ago`
  if (diff < MS_PER_DAY) return `${Math.floor(diff / MS_PER_HOUR)}h ago`
  return `${Math.floor(diff / MS_PER_DAY)}d ago`
}

export function authorLabel(n: Notification): string {
  if (!n.author) return 'System'
  return n.author.name ?? n.author.email
}

export function partyDisplayName(p: { name: string | null; email: string } | null): string {
  if (!p) return 'System'
  return p.name ?? p.email
}

export function apiErrorLabel(err: unknown): string {
  if (err instanceof ApiError) return `${err.status} ${String(err.code)}`
  if (err instanceof Error) return err.message
  return 'unknown error'
}

export const CATEGORY_LABELS: Record<NotificationCategory, string> = {
  chat: 'Chats',
  report: 'Reports',
  compliance: 'Compliance',
  task: 'Tasks',
  system: 'System',
}

// Order shown in chips on the Alerts view. Chat is intentionally excluded —
// chat-category notifications live on the Conversations tab now.
export const ALERT_CATEGORY_ORDER: NotificationCategory[] = ['report', 'compliance', 'task']

export function CategoryIcon({
  category,
  className,
}: {
  category: NotificationCategory
  className?: string
}) {
  const cls = cn('h-4 w-4', className)
  switch (category) {
    case 'report':
      return <FileText className={cls} aria-hidden />
    case 'compliance':
      return <ShieldAlert className={cls} aria-hidden />
    case 'task':
      return <ListTodo className={cls} aria-hidden />
    case 'system':
      return <Info className={cls} aria-hidden />
    default:
      return <MessageSquare className={cls} aria-hidden />
  }
}

// Two-letter monogram for avatar circles in conversation rows / bubbles.
export function initials(party: { name: string | null; email: string }): string {
  const source = party.name?.trim() || party.email
  const parts = source.split(/[\s.@_-]+/).filter(Boolean)
  if (parts.length === 0) return '?'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return (parts[0]![0]! + parts[1]![0]!).toUpperCase()
}

// Tiny debounce for search inputs.
export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return debounced
}

export function ListSkeleton() {
  return (
    <ul className="flex flex-col gap-3 px-4 py-6">
      {[0, 1, 2, 3, 4].map((i) => (
        <li key={i} className="flex animate-pulse gap-2.5">
          <div className="mt-1 h-7 w-7 shrink-0 rounded-full bg-muted" />
          <div className="flex flex-1 flex-col gap-1.5">
            <div className="h-3 w-1/3 rounded bg-muted" />
            <div className="h-3 w-full rounded bg-muted/70" />
            <div className="h-3 w-4/5 rounded bg-muted/70" />
          </div>
        </li>
      ))}
    </ul>
  )
}

// Match the existing chat panel's "gm" monogram so AI-composed messages read
// as "Ryan via the assistant" rather than as a separate bot identity.
export function GmMonogram({ className }: { className?: string }) {
  return (
    <span
      role="img"
      className={cn(
        'inline-flex h-4 w-4 items-center justify-center rounded-full border border-border bg-background text-[8px] font-semibold text-foreground/70 leading-none tracking-tight',
        className,
      )}
      title="Sent via the assistant"
      aria-label="Sent via the assistant"
    >
      gm
    </span>
  )
}
