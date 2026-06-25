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
    <div className="border-t border-border/40 bg-muted/15 px-4 py-3">
      {note.automated && replyTarget ? (
        <p className="mb-2 text-[10px] text-foreground/55">
          Replies go to <span className="font-medium text-foreground/75">{replyTarget}</span>
        </p>
      ) : null}
      {replies.isLoading && rows.length === 0 ? (
        <p className="text-[11px] text-foreground/50 italic">Loading replies…</p>
      ) : rows.length > 0 ? (
        <ul className="mb-2 flex flex-col gap-2">
          {rows.map((r) => (
            <li
              key={r.id}
              className="flex flex-col gap-0.5 rounded-md bg-background px-2.5 py-1.5 text-sm shadow-sm"
            >
              <div className="flex items-baseline justify-between gap-2 text-[10px] text-foreground/60">
                <span className="font-medium text-foreground/80">
                  {r.author.name ?? r.author.email}
                </span>
                <time dateTime={r.createdAt}>{formatRelative(r.createdAt)}</time>
              </div>
              <p className="whitespace-pre-wrap break-words text-foreground text-sm leading-snug">
                {r.body}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-2 text-[11px] text-foreground/50 italic">No replies yet.</p>
      )}

      <form className="flex items-end gap-2" onSubmit={onSubmit}>
        <textarea
          value={draft}
          onChange={(e) => onDraftChange(e.target.value)}
          placeholder={placeholder}
          rows={1}
          maxLength={2000}
          disabled={compose.isPending}
          className="max-h-32 min-h-9 flex-1 resize-none rounded-md border border-border bg-background px-2.5 py-1.5 text-sm placeholder:text-foreground/40 focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        <button
          type="submit"
          disabled={compose.isPending || draft.trim().length === 0}
          className="shrink-0 cursor-pointer rounded-md bg-foreground px-2.5 py-1.5 font-medium text-background text-xs transition-opacity hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {compose.isPending ? 'Sending…' : 'Send'}
        </button>
      </form>
    </div>
  )
}
