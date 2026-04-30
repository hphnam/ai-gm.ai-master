'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { HelpCircle, Loader2, Sparkles, Trash2, User } from 'lucide-react'
import type { KbGapDto } from '@/generated/api'
import type { KbGapAskerDto as KbGapAsker } from '@/lib/api-types'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useAnswerGap, useDeleteGap } from '@/lib/hooks/use-docs'
import { mapApiError } from '@/lib/map-api-error'

function askerLabel(a: KbGapAsker): string {
  return a.name?.trim() || a.email || 'unknown user'
}

function formatAskedBy(askers: KbGapAsker[]): { primary: string; title: string } | null {
  if (!askers.length) return null
  const labels = askers.map(askerLabel)
  const title = askers.map((a) => `${askerLabel(a)}${a.email && a.email !== askerLabel(a) ? ` <${a.email}>` : ''}`).join('\n')
  if (labels.length === 1) return { primary: labels[0], title }
  if (labels.length === 2) return { primary: `${labels[0]}, ${labels[1]}`, title }
  return { primary: `${labels[0]}, ${labels[1]} +${labels.length - 2}`, title }
}

function formatRelative(iso: string): string {
  const ts = new Date(iso).getTime()
  const diffMs = Date.now() - ts
  const mins = Math.round(diffMs / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.round(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.round(hrs / 24)
  if (days < 30) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

function GapCard({ gap }: { gap: KbGapDto }) {
  const [open, setOpen] = useState(false)
  const [answer, setAnswer] = useState('')
  const answerGap = useAnswerGap()
  const deleteGap = useDeleteGap()
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

  async function handleDelete() {
    if (!window.confirm('Delete this question? It will no longer appear in the queue.')) return
    try {
      await deleteGap.mutateAsync(gap.id)
      toast.success('Question deleted')
    } catch (err) {
      toast.error(mapApiError(err))
    }
  }

  return (
    <div className="rounded-lg border bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1.5">
            <HelpCircle className="h-3.5 w-3.5" />
            <span>Asked {formatRelative(gap.lastAskedAt ?? gap.updatedAt)}</span>
            {gap.askCount > 1 ? (
              <span className="rounded-full bg-amber-500/10 px-1.5 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                asked {gap.askCount}×
              </span>
            ) : null}
            {gap.venueName ? (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px]">
                {gap.venueName}
              </span>
            ) : (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px]">global</span>
            )}
          </div>
          <p className="text-sm font-medium leading-snug">{gap.question}</p>
          {askedBy ? (
            <div
              className="mt-1.5 flex items-center gap-1 text-[11px] text-muted-foreground"
              title={askedBy.title}
            >
              <User className="h-3 w-3" />
              <span>by {askedBy.primary}</span>
            </div>
          ) : null}
          {gap.tentativeAnswer ? (
            <div className="mt-2 rounded-md border-l-2 border-blue-500/40 bg-blue-500/5 px-3 py-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-blue-600 dark:text-blue-400 mb-0.5">
                <Sparkles className="h-3 w-3" />
                AI tentative answer (shown to staff)
              </div>
              <p className="leading-relaxed">{gap.tentativeAnswer}</p>
            </div>
          ) : null}
        </div>
        {!open ? (
          <div className="flex items-center gap-1.5">
            <Button size="sm" variant="outline" onClick={() => setOpen(true)}>
              Answer
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={handleDelete}
              disabled={deleteGap.isPending}
              aria-label="Delete question"
              title="Delete question"
              className="text-muted-foreground hover:text-destructive"
            >
              {deleteGap.isPending ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
            </Button>
          </div>
        ) : null}
      </div>

      {open ? (
        <div className="mt-3 space-y-2">
          <Textarea
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
            placeholder="Your authoritative answer. Will be indexed and retrievable by staff next time."
            rows={4}
            className="text-sm"
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
            >
              Cancel
            </Button>
            <Button size="sm" onClick={handleSubmit} disabled={answerGap.isPending}>
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
  )
}

export function GapList({ gaps }: { gaps: KbGapDto[] }) {
  if (gaps.length === 0) return null
  return (
    <section aria-label="Pending answers">
      <header className="mb-2 flex items-baseline gap-2 px-1">
        <h3 className="text-sm font-semibold">Questions waiting for your answer</h3>
        <span className="text-xs text-muted-foreground">
          {gaps.length} from staff
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
