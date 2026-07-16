'use client'

import { MessageSquare, Users } from 'lucide-react'
import { CardEmpty, CardShell } from './card-shell'
import { isToolFail, isToolOk, sanitizeMentionName, type ToolCardRendererProps } from './types'

type NoteData =
  | { status: 'created'; id: string; recipientName: string; body?: string }
  | {
      status: 'needs-disambiguation'
      candidates: Array<{ userId: string; name: string; role?: string }>
      body: string
    }
  | { status: 'no-match'; body: string }

export function NoteCard({ part, ctx }: ToolCardRendererProps) {
  const output = part.output
  if (isToolFail(output)) {
    return (
      <CardShell icon={MessageSquare} title="Note">
        <CardEmpty message={output.detail ?? "Couldn't deliver that note."} />
      </CardShell>
    )
  }
  if (!isToolOk<NoteData>(output)) return null
  const data = output.data

  if (data.status === 'no-match') {
    return (
      <CardShell icon={Users} title="No match" tone="warning">
        <p className="text-[13px] leading-snug text-[var(--ink-text)]">
          Couldn&apos;t find that person. Try a different name.
        </p>
      </CardShell>
    )
  }

  if (data.status === 'needs-disambiguation') {
    const body = data.body
    return (
      <CardShell icon={Users} title="Which one?" subtitle={`${data.candidates.length} matches`}>
        <p className="mb-2 text-[12.5px] leading-snug text-[var(--ink-muted)]">
          Tap who you meant — I&apos;ll send the note.
        </p>
        <div className="flex flex-col gap-1">
          {data.candidates.map((c) => (
            <button
              key={c.userId}
              type="button"
              onClick={() =>
                ctx.onPrompt?.(
                  `Send that note to @[${sanitizeMentionName(c.name)}](${c.userId}): ${body}`,
                )
              }
              className="flex items-center justify-between gap-2 rounded-md border border-[var(--hairline)] bg-[#fcfaf3] px-3 py-2 text-left text-[13px] text-[var(--ink-text)] transition-colors hover:bg-[var(--paper-2)]"
            >
              <span className="font-medium">{c.name}</span>
              {c.role ? (
                <span className="font-mono-ledger text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--mono-muted)]">
                  {c.role}
                </span>
              ) : null}
            </button>
          ))}
        </div>
      </CardShell>
    )
  }

  return (
    <CardShell
      icon={MessageSquare}
      title="Note delivered"
      subtitle={`For ${data.recipientName}`}
      tone="success"
    >
      {data.body ? (
        <p className="text-[13.5px] leading-snug text-[var(--ink-text)]">{data.body}</p>
      ) : (
        <p className="text-[12.5px] text-[var(--ink-muted)]">They&apos;ll see it in their inbox.</p>
      )}
    </CardShell>
  )
}
