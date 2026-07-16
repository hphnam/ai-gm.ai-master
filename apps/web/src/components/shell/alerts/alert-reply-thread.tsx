'use client'

import { toast } from 'sonner'
import {
  type Notification,
  useComposeReply,
  useNotificationReplies,
} from '@/lib/hooks/use-notifications'
import { apiErrorLabel, formatRelative } from '../notifications-shared'

export function AlertReplyThread({
  note,
  draft,
  onDraftChange,
}: {
  note: Notification
  draft: string
  onDraftChange: (v: string) => void
}) {
  const replies = useNotificationReplies(note.id, { enabled: true })
  const compose = useComposeReply()

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = draft.trim()
    if (trimmed.length === 0 || compose.isPending) return
    try {
      await compose.mutateAsync({ notificationId: note.id, body: trimmed })
      onDraftChange('')
    } catch (err) {
      toast.error(`Couldn't send reply: ${apiErrorLabel(err)}`)
    }
  }

  // Replies route to the original author of the parent notification — for
  // an automated gm reminder, that's the task creator. Surface their name in
  // the placeholder so the user knows their reply isn't going "to gm".
  const replyTarget =
    note.author && (note.author.name ?? note.author.email)
      ? (note.author.name ?? note.author.email)
      : null
  const placeholder = replyTarget ? `Reply to ${replyTarget}…` : 'Reply…'

  const rows = replies.data?.replies ?? []
  return (
    <div className="border-t border-[var(--hairline-soft)] bg-[var(--paper-2)]/40 px-4 py-3">
      {note.automated && replyTarget ? (
        <p className="mb-2 text-[10px] text-[var(--ink-muted)]">
          Replies go to <span className="font-semibold text-foreground">{replyTarget}</span>
        </p>
      ) : null}
      {replies.isLoading && rows.length === 0 ? (
        <p className="text-[11px] text-[var(--mono-muted)] italic">Loading replies…</p>
      ) : rows.length > 0 ? (
        <ul className="mb-2 flex flex-col gap-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-0.5 rounded-lg border border-[var(--hairline-soft)] bg-[var(--ledger-card)] px-2.5 py-1.5 text-sm"
            >
              <div className="flex items-baseline justify-between gap-2 text-[10px]">
                <span className="font-semibold text-foreground">
                  {r.author.name ?? r.author.email}
                </span>
                <time dateTime={r.createdAt} className="font-mono-ledger text-[var(--ink-faint)]">
                  {formatRelative(r.createdAt)}
                </time>
              </div>
              <p className="whitespace-pre-wrap break-words text-foreground text-sm leading-snug">
                {r.body}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mb-2 rounded-lg border border-dashed border-[var(--hairline)] py-3 text-center">
          <p className="text-xs text-[var(--mono-muted)]">No replies yet</p>
        </div>
      )}

      <form className="flex items-end gap-2" onSubmit={onSubmit}>
        <textarea
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder={placeholder}
          rows={1}
          maxLength={2000}
          disabled={compose.isPending}
          className="max-h-32 min-h-9 flex-1 resize-none rounded-lg border border-[var(--hairline)] bg-[var(--ledger-card)] px-2.5 py-1.5 text-sm placeholder:text-[var(--ink-faint)] focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        <button
          type="submit"
          disabled={compose.isPending || draft.trim().length === 0}
          className="inline-flex min-h-9 shrink-0 cursor-pointer items-center rounded-lg bg-[var(--brass)] px-3 font-semibold text-[var(--cream-hi)] text-xs shadow-[0_2px_0_var(--brass-shadow)] transition-colors hover:bg-[var(--brass-shadow)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {compose.isPending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  )
}
