'use client'

import { AlertTriangle, Inbox, Sparkles, Tag } from 'lucide-react'
import Link from 'next/link'
import { useMemo, useState } from 'react'
import { ClassifyDocModal } from '@/components/docs/classify-doc-modal'
import { DocTypeProposalModal } from '@/components/docs/doc-type-proposal-modal'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import type { DocListItemDto as DocListItem } from '@/generated/api'
import { useInbox } from '@/lib/hooks/use-docs'
import { cn } from '@/lib/utils'

type Tone = 'attention' | 'suggestion' | 'failed'

function InboxRow({
  tone,
  icon,
  title,
  note,
  action,
}: {
  tone: Tone
  icon: React.ReactNode
  title: string
  note: string
  action: React.ReactNode
}) {
  // Single clean row. Severity reads from the glyph + note copy; the failed
  // tone earns a destructive-tinted tile because it's a true alarm.
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3.5">
      <span
        className={cn(
          'flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground',
          tone === 'failed' && 'bg-destructive/10 text-destructive',
        )}
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <p className="mt-1 truncate font-mono-ledger text-[11.5px] text-[#a5987c]">{note}</p>
      </div>
      <div className="shrink-0">{action}</div>
    </div>
  )
}

function docLabel(doc: DocListItem): string {
  return doc.title?.trim() || 'Untitled document'
}

function ProposalCard({ doc }: { doc: DocListItem }) {
  const [open, setOpen] = useState(false)
  if (!doc.pendingTypeProposal) return null
  const proposal = doc.pendingTypeProposal
  return (
    <>
      <InboxRow
        tone="suggestion"
        icon={<Sparkles className="h-4 w-4" aria-hidden />}
        title={docLabel(doc)}
        note={`AI thinks this is a ${proposal.name.toLowerCase()}`}
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOpen(true)}
            className="cursor-pointer"
          >
            Review
          </Button>
        }
      />
      {open ? (
        <DocTypeProposalModal
          docId={doc.id}
          proposal={proposal}
          open={open}
          onOpenChange={setOpen}
        />
      ) : null}
    </>
  )
}

function UnclassifiedCard({ doc }: { doc: DocListItem }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <InboxRow
        tone="attention"
        icon={<Tag className="h-4 w-4" aria-hidden />}
        title={docLabel(doc)}
        note="Needs a category so the AI knows how to use it"
        action={
          <Button
            size="sm"
            variant="outline"
            onClick={() => setOpen(true)}
            className="cursor-pointer"
          >
            Pick a category
          </Button>
        }
      />
      {open ? <ClassifyDocModal docId={doc.id} open={open} onOpenChange={setOpen} /> : null}
    </>
  )
}

function FailedCard({ doc }: { doc: DocListItem }) {
  return (
    <InboxRow
      tone="failed"
      icon={<AlertTriangle className="h-4 w-4" aria-hidden />}
      title={docLabel(doc)}
      note={
        doc.processingError
          ? `${doc.processingError} — try a Word doc or paste the text`
          : 'Couldn’t read this file — try a Word doc or paste the text'
      }
      action={
        <Button size="sm" variant="outline" asChild className="cursor-pointer">
          <Link href={`/docs/${doc.id}`}>See details</Link>
        </Button>
      }
    />
  )
}

function partition(docs: DocListItem[] | undefined) {
  const safe = docs ?? []
  return {
    failed: safe.filter((d) => d.processingStatus === 'failed'),
    proposals: safe.filter((d) => d.processingStatus === 'ready' && d.pendingTypeProposal),
    unclassified: safe.filter(
      (d) => d.processingStatus === 'ready' && !d.documentType && !d.pendingTypeProposal,
    ),
  }
}

export function useInboxCount(): number {
  const docs = useInbox()
  const { failed, proposals, unclassified } = useMemo(() => partition(docs.data), [docs.data])
  return failed.length + proposals.length + unclassified.length
}

function Section({
  title,
  count,
  children,
}: {
  title: string
  count: number
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2.5">
      <header className="flex items-center gap-2">
        <span className="font-mono-ledger text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--mono-muted)]">
          {title}
        </span>
        <span className="font-mono-ledger rounded-full bg-[rgba(32,26,18,0.06)] px-1.5 py-0.5 text-[10px] font-semibold text-muted-foreground tabular-nums">
          {count}
        </span>
      </header>
      <div className="space-y-2">{children}</div>
    </section>
  )
}

const INBOX_SKELETON_KEYS = ['a', 'b', 'c']

function EmptyInbox() {
  return (
    <EmptyState
      icon={Inbox}
      title="Inbox is clear"
      description="New uploads needing your review will show up here."
    />
  )
}

export function InboxTab() {
  const docs = useInbox()
  const { failed, proposals, unclassified } = useMemo(() => partition(docs.data), [docs.data])

  if (docs.isLoading) {
    return (
      <div className="space-y-2">
        {INBOX_SKELETON_KEYS.map((k) => (
          <Skeleton key={k} className="h-[62px] w-full rounded-xl" />
        ))}
      </div>
    )
  }

  const total = failed.length + proposals.length + unclassified.length
  if (total === 0) return <EmptyInbox />

  return (
    <div className="space-y-6">
      {failed.length > 0 ? (
        <Section title="Couldn’t read" count={failed.length}>
          {failed.map((d) => (
            <FailedCard key={d.id} doc={d} />
          ))}
        </Section>
      ) : null}

      {proposals.length > 0 ? (
        <Section title="AI suggestions to review" count={proposals.length}>
          {proposals.map((d) => (
            <ProposalCard key={d.id} doc={d} />
          ))}
        </Section>
      ) : null}

      {unclassified.length > 0 ? (
        <Section title="Need a category" count={unclassified.length}>
          {unclassified.map((d) => (
            <UnclassifiedCard key={d.id} doc={d} />
          ))}
        </Section>
      ) : null}
    </div>
  )
}
