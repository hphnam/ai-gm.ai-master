'use client'

import { Check, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import type { Notification } from '@/lib/hooks/use-notifications'
import { useUpdateTask } from '@/lib/hooks/use-tasks'
import { apiErrorLabel } from '../notifications-shared'

/// Renders the row's action buttons. Two sources:
///   - structured `note.reference` (preferred — survives body edits)
///   - markdown link in the body (legacy path for rows that pre-date the
///     reference column; gracefully falls through)
/// For `reference.kind === 'task'` we also surface a "Mark complete"
/// mutation alongside the "Open task" link.
export function ActionRow({
  note,
  bodyAction,
}: {
  note: Notification
  bodyAction: { label: string; href: string } | null
}) {
  const updateTask = useUpdateTask()
  // Reference takes precedence; bodyAction only fills the gap for old rows
  // that don't have one (backfill from before this column existed).
  const ref = note.reference
  const refHref =
    ref?.kind === 'task'
      ? `/tasks/${encodeURIComponent(ref.id)}`
      : ref?.kind === 'report'
        ? `/reports/${encodeURIComponent(ref.id)}`
        : null
  const href = refHref ?? bodyAction?.href ?? null
  const openLabel =
    ref?.kind === 'task'
      ? 'Open task'
      : ref?.kind === 'report'
        ? 'Open report'
        : (bodyAction?.label ?? null)

  if (!href && ref?.kind !== 'task') return null

  return (
    // Rendered as a sibling of the row's toggle button (not a child) so the
    // Link + button below sit in valid DOM. Padding mirrors the toggle
    // button's so the action chips align with the body text above.
    <div className="-mt-1 flex flex-wrap items-center gap-1.5 px-4 pb-2.5 pl-[3.25rem]">
      {href ? (
        <Link
          href={href}
          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--hairline)] bg-[var(--ledger-card)] px-3 py-1.5 font-semibold text-[11px] text-foreground transition-colors hover:border-[var(--hairline-strong)]"
        >
          {openLabel ?? 'Open'}
        </Link>
      ) : null}
      {ref?.kind === 'task' ? (
        <button
          type="button"
          disabled={updateTask.isPending}
          onClick={() => {
            updateTask.mutate(
              { id: ref.id, status: 'done' },
              {
                onSuccess: () => toast.success('Task marked complete'),
                onError: (err) => toast.error(`Couldn't mark complete: ${apiErrorLabel(err)}`),
              },
            )
          }}
          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-[var(--hairline)] bg-[var(--ledger-card)] px-3 py-1.5 font-semibold text-[11px] text-foreground transition-colors hover:border-[var(--hairline-strong)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {updateTask.isPending ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          ) : (
            <Check className="h-3 w-3" aria-hidden />
          )}
          Mark complete
        </button>
      ) : null}
    </div>
  )
}
