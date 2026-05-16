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

function InboxCard({
  tone,
  icon,
  title,
  body,
  primary,
  secondary,
}: {
  tone: Tone
  icon: React.ReactNode
  title: React.ReactNode
  body: React.ReactNode
  primary: React.ReactNode
  secondary?: React.ReactNode
}) {
  // Single restrained card style. Severity is communicated via icon glyph
  // and copy — not via tinted backgrounds. The destructive tone earns a
  // colored left-rule because it represents a true alarm; the other tones
  // stay neutral.
  return (
    <div
      className={cn(
        'rounded-2xl border border-border bg-card p-5',
        tone === 'failed' && 'border-l-2 border-l-destructive',
      )}
    >
      <div className="flex items-start gap-4">
        <div
          className={cn(
            'flex h-7 w-7 shrink-0 items-center justify-center text-muted-foreground',
            tone === 'failed' && 'text-destructive',
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-[15px] font-medium leading-snug text-foreground">{title}</p>
          <p className="text-sm leading-relaxed text-muted-foreground">{body}</p>
          <div className="flex flex-wrap gap-2 pt-2">
            {primary}
            {secondary}
          </div>
        </div>
      </div>
    </div>
  )
}

function docLabel(doc: DocListItem): string {
  return doc.title?.trim() || 'this document'
}

function ProposalCard({ doc }: { doc: DocListItem }) {
  const [open, setOpen] = useState(false)
  if (!doc.pendingTypeProposal) return null
  const proposal = doc.pendingTypeProposal
  return (
    <>
      <InboxCard
        tone="suggestion"
        icon={<Sparkles className="h-4 w-4" aria-hidden />}
        title={
          <>
            Is <span className="text-foreground">&ldquo;{docLabel(doc)}&rdquo;</span> a{' '}
            {proposal.name.toLowerCase()}?
          </>
        }
        body={
          proposal.description
            ? `Our AI thinks so. ${proposal.description} Confirm so we file similar docs the same way next time.`
            : 'Our AI thinks so. Confirm and we’ll file similar docs the same way next time.'
        }
        primary={
          <Button size="sm" onClick={() => setOpen(true)} className="cursor-pointer">
            Review &amp; confirm
          </Button>
        }
        secondary={
          <Button size="sm" variant="ghost" asChild className="cursor-pointer">
            <Link href={`/docs/${doc.id}`}>Open document</Link>
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
      <InboxCard
        tone="attention"
        icon={<Tag className="h-4 w-4" aria-hidden />}
        title={
          <>
            What kind of document is{' '}
            <span className="text-foreground">&ldquo;{docLabel(doc)}&rdquo;</span>?
          </>
        }
        body="Pick a category so the AI and your team know how to use it. Takes about ten seconds."
        primary={
          <Button size="sm" onClick={() => setOpen(true)} className="cursor-pointer">
            Pick a category
          </Button>
        }
        secondary={
          <Button size="sm" variant="ghost" asChild className="cursor-pointer">
            <Link href={`/docs/${doc.id}`}>Open document</Link>
          </Button>
        }
      />
      {open ? <ClassifyDocModal docId={doc.id} open={open} onOpenChange={setOpen} /> : null}
    </>
  )
}

function FailedCard({ doc }: { doc: DocListItem }) {
  return (
    <InboxCard
      tone="failed"
      icon={<AlertTriangle className="h-4 w-4" aria-hidden />}
      title={
        <>
          We couldn’t read <span className="text-foreground">&ldquo;{docLabel(doc)}&rdquo;</span>
        </>
      }
      body={
        doc.processingError
          ? `${doc.processingError}. Try uploading a Word doc, or paste the text directly.`
          : 'It might be a scanned image or password-protected PDF. Try uploading a Word doc, or paste the text directly.'
      }
      primary={
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
  hint,
  children,
}: {
  title: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <section className="space-y-2">
      <header className="flex items-baseline gap-2 px-1">
        <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
        {hint ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      </header>
      <div className="space-y-3">{children}</div>
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
      <div className="space-y-3">
        {INBOX_SKELETON_KEYS.map((k) => (
          <Skeleton key={k} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    )
  }

  const total = failed.length + proposals.length + unclassified.length
  if (total === 0) return <EmptyInbox />

  return (
    <div className="space-y-6">
      {failed.length > 0 ? (
        <Section
          title="Couldn’t read"
          hint={`${failed.length} ${failed.length === 1 ? 'document' : 'documents'} need a different format`}
        >
          {failed.map((d) => (
            <FailedCard key={d.id} doc={d} />
          ))}
        </Section>
      ) : null}

      {proposals.length > 0 ? (
        <Section
          title="AI suggestions to review"
          hint={`${proposals.length} ${proposals.length === 1 ? 'category' : 'categories'} waiting on you`}
        >
          {proposals.map((d) => (
            <ProposalCard key={d.id} doc={d} />
          ))}
        </Section>
      ) : null}

      {unclassified.length > 0 ? (
        <Section
          title="Need a category"
          hint={`${unclassified.length} ${unclassified.length === 1 ? 'document' : 'documents'} to file`}
        >
          {unclassified.map((d) => (
            <UnclassifiedCard key={d.id} doc={d} />
          ))}
        </Section>
      ) : null}
    </div>
  )
}
