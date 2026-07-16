'use client'

import { ExternalLink, Loader2, Search, Sparkles, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDeleteDialog } from '@/components/ui/confirm-delete-dialog'
import { Textarea } from '@/components/ui/textarea'
import type { KbGapDto } from '@/generated/api'
import type { KbGapAskerDto as KbGapAsker } from '@/lib/api-types'
import { formatRelative } from '@/lib/format-relative'
import { type GapKbMatch, useAnswerGap, useDeleteGap, useGapKbMatches } from '@/lib/hooks/use-docs'
import { mapApiError } from '@/lib/map-api-error'
import { cn } from '@/lib/utils'

function askerLabel(a: KbGapAsker): string {
  return a.name?.trim() || a.email || 'unknown user'
}

function formatAskedBy(askers: KbGapAsker[]): { primary: string; title: string } | null {
  if (!askers.length) return null
  const labels = askers.map(askerLabel)
  const title = askers
    .map((a) => `${askerLabel(a)}${a.email && a.email !== askerLabel(a) ? ` <${a.email}>` : ''}`)
    .join('\n')
  if (labels.length === 1) return { primary: labels[0], title }
  if (labels.length === 2) return { primary: `${labels[0]}, ${labels[1]}`, title }
  return { primary: `${labels[0]}, ${labels[1]} +${labels.length - 2}`, title }
}

function GapCard({ gap }: { gap: KbGapDto }) {
  const [open, setOpen] = useState(false)
  const [answer, setAnswer] = useState('')
  const [matches, setMatches] = useState<GapKbMatch[] | null>(null)
  const [pendingAction, setPendingAction] = useState<'delete' | 'resolve' | null>(null)
  const answerGap = useAnswerGap()
  const deleteGap = useDeleteGap()
  const kbMatches = useGapKbMatches()
  const askedBy = formatAskedBy(gap.askedBy)

  async function handleSubmit() {
    const trimmed = answer.trim()
    if (trimmed.length < 5) {
      toast.error('Answer is too short')
      return
    }
    try {
      await answerGap.mutateAsync({ id: gap.id, answer: trimmed })
      toast.success('Answer saved — being indexed now')
      setAnswer('')
      setOpen(false)
    } catch (err) {
      toast.error(mapApiError(err))
    }
  }

  async function handleConfirmAction() {
    try {
      await deleteGap.mutateAsync(gap.id)
      toast.success(
        pendingAction === 'resolve' ? 'Resolved — already in your KB' : 'Question deleted',
      )
      setPendingAction(null)
    } catch (err) {
      toast.error(mapApiError(err))
      throw err
    }
  }

  async function handleSearchKb() {
    try {
      const hits = await kbMatches.mutateAsync(gap.id)
      setMatches(hits)
    } catch (err) {
      toast.error(mapApiError(err))
    }
  }

  const venueLabel = gap.venueName ?? 'Global'
  const askedTime = formatRelative(gap.lastAskedAt ?? gap.updatedAt)

  return (
    <div className="rounded-xl border bg-card px-4 py-3.5 sm:px-5">
      <div className="flex items-start gap-3">
        <span
          className="mt-[7px] h-[7px] w-[7px] shrink-0 rounded-full bg-[var(--clay)]"
          aria-hidden
        />

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug text-foreground">{gap.question}</p>
              <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono-ledger text-xs text-[var(--mono-muted)]">
                {gap.askCount > 1 ? (
                  <span className="rounded-full bg-warning/15 px-1.5 py-0.5 text-[11px] font-medium text-warning">
                    asked {gap.askCount}×
                  </span>
                ) : null}
                {askedBy ? <span title={askedBy.title}>by {askedBy.primary}</span> : null}
                <span className="text-muted-foreground/40" aria-hidden>
                  ·
                </span>
                <span>{venueLabel}</span>
                <span className="text-muted-foreground/40" aria-hidden>
                  ·
                </span>
                <span>{askedTime}</span>
              </div>
            </div>
            {!open ? (
              <Button
                size="sm"
                variant="outline"
                onClick={() => setOpen(true)}
                className="shrink-0 cursor-pointer"
              >
                Add answer
              </Button>
            ) : null}
          </div>

          {gap.tentativeAnswer ? (
            <div className="rounded-md border-l-2 border-primary/40 bg-primary/5 px-3 py-2 text-xs leading-relaxed text-muted-foreground">
              <div className="mb-0.5 flex items-center gap-1 font-mono-ledger text-[11px] uppercase tracking-wide text-primary">
                <Sparkles className="h-3 w-3" />
                AI tentative answer (shown to staff)
              </div>
              <p>{gap.tentativeAnswer}</p>
            </div>
          ) : null}

          {!open ? (
            <div className="flex flex-wrap items-center gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSearchKb}
                disabled={kbMatches.isPending}
                title="See if your KB already has the answer"
                className="h-7 cursor-pointer px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                {kbMatches.isPending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Search className="mr-1.5 h-3.5 w-3.5" />
                )}
                Already answered?
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setPendingAction('delete')}
                disabled={deleteGap.isPending}
                className="ml-auto h-7 cursor-pointer px-2 text-xs text-muted-foreground hover:text-destructive"
              >
                {deleteGap.isPending ? (
                  <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                )}
                Delete
              </Button>
            </div>
          ) : null}

          {matches !== null && !open ? (
            matches.length === 0 ? (
              <p className="border-t pt-3 text-xs text-muted-foreground">
                Nothing in your KB looks like a fit. Use “Add answer” to write one.
              </p>
            ) : (
              <div className="border-t pt-2">
                <p className="mb-1 px-0.5 font-mono-ledger text-[11px] font-medium uppercase tracking-wide text-[var(--mono-muted)]">
                  Possible matches in your KB
                </p>
                <ul className="divide-y">
                  {matches.map((m) => (
                    <li key={m.docId} className="py-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {m.title?.trim() || 'Untitled document'}
                          </p>
                          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                            {m.snippet}
                          </p>
                        </div>
                        <span className="shrink-0 font-mono-ledger text-[11px] tabular-nums text-[var(--mono-muted)]">
                          {Math.round(m.similarity * 100)}% match
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setPendingAction('resolve')}
                          disabled={deleteGap.isPending}
                          className="h-7 cursor-pointer text-xs"
                        >
                          This answers it
                        </Button>
                        <Button
                          asChild
                          size="sm"
                          variant="ghost"
                          className="h-7 cursor-pointer text-xs text-muted-foreground hover:text-foreground"
                        >
                          <Link href={`/docs/${m.docId}`}>
                            <ExternalLink className="mr-1 h-3 w-3" />
                            Open
                          </Link>
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )
          ) : null}

          {open ? (
            <div className="space-y-2 pt-1">
              <Textarea
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Your authoritative answer. Will be indexed and retrievable by staff next time."
                rows={4}
                autoFocus
                className={cn('text-sm', answerGap.isPending && 'opacity-60')}
              />
              <div className="flex justify-end gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setOpen(false)
                    setAnswer('')
                  }}
                  disabled={answerGap.isPending}
                  className="cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmit}
                  disabled={answerGap.isPending}
                  className="cursor-pointer"
                >
                  {answerGap.isPending ? (
                    <>
                      <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                      Saving
                    </>
                  ) : (
                    'Save answer'
                  )}
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <ConfirmDeleteDialog
        open={pendingAction !== null}
        onOpenChange={(v) => !v && setPendingAction(null)}
        title={pendingAction === 'resolve' ? 'Mark as already answered?' : 'Delete this question?'}
        description={
          pendingAction === 'resolve'
            ? 'This marks the question as already answered by the KB and removes it from the queue.'
            : 'It will no longer appear in the queue.'
        }
        confirmLabel={pendingAction === 'resolve' ? 'Mark resolved' : 'Delete'}
        isPending={deleteGap.isPending}
        onConfirm={handleConfirmAction}
      />
    </div>
  )
}

export function GapList({ gaps }: { gaps: KbGapDto[] }) {
  if (gaps.length === 0) return null
  return (
    <section aria-label="Pending answers" className="space-y-2.5">
      <header className="flex items-center gap-2">
        <span className="font-mono-ledger text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--mono-muted)]">
          Questions waiting on you
        </span>
        <span className="font-mono-ledger rounded-full bg-[rgba(32,26,18,0.06)] px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground tabular-nums">
          {gaps.length}
        </span>
      </header>
      <div className="space-y-2">
        {gaps.map((g) => (
          <GapCard key={g.id} gap={g} />
        ))}
      </div>
    </section>
  )
}
