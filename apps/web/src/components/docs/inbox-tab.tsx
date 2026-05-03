'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, Inbox, Sparkles, Tag } from 'lucide-react'
import type { DocListItemDto as DocListItem } from '@/generated/api'
import { Button } from '@/components/ui/button'
import { ClassifyDocModal } from '@/components/docs/classify-doc-modal'
import { DocTypeProposalModal } from '@/components/docs/doc-type-proposal-modal'
import { useInbox } from '@/lib/hooks/use-docs'
import { cn } from '@/lib/utils'

type Tone = 'amber' | 'blue' | 'red'

const toneStyles: Record<Tone, { icon: string; ring: string }> = {
  amber: {
    icon: 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    ring: 'ring-amber-500/15',
  },
  blue: {
    icon: 'bg-sky-500/15 text-sky-700 dark:text-sky-300',
    ring: 'ring-sky-500/15',
  },
  red: {
    icon: 'bg-red-500/15 text-red-700 dark:text-red-300',
    ring: 'ring-red-500/15',
  },
}

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
  const t = toneStyles[tone]
  return (
    <div
      className={cn(
        'rounded-xl border bg-card p-4 shadow-sm ring-1 sm:p-5',
        t.ring,
      )}
    >
      <div className="flex items-start gap-3 sm:gap-4">
        <div
          className={cn(
            'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
            t.icon,
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1 space-y-1.5">
          <p className="text-sm font-semibold leading-snug sm:text-base">
            {title}
          </p>
          <p className="text-sm leading-relaxed text-muted-foreground">
            {body}
          </p>
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
        tone="blue"
        icon={<Sparkles className="h-4 w-4" aria-hidden />}
        title={
          <>
            Is <span className="text-foreground">&ldquo;{docLabel(doc)}&rdquo;</span>{' '}
            a {proposal.name.toLowerCase()}?
          </>
        }
        body={
          proposal.description
            ? `Our AI thinks so. ${proposal.description} Confirm so we file similar docs the same way next time.`
            : 'Our AI thinks so. Confirm and we’ll file similar docs the same way next time.'
        }
        primary={
          <Button
            size="sm"
            onClick={() => setOpen(true)}
            className="cursor-pointer"
          >
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
        tone="amber"
        icon={<Tag className="h-4 w-4" aria-hidden />}
        title={
          <>
            What kind of document is{' '}
            <span className="text-foreground">&ldquo;{docLabel(doc)}&rdquo;</span>?
          </>
        }
        body="Pick a category so the AI and your team know how to use it. Takes about ten seconds."
        primary={
          <Button
            size="sm"
            onClick={() => setOpen(true)}
            className="cursor-pointer"
          >
            Pick a category
          </Button>
        }
        secondary={
          <Button size="sm" variant="ghost" asChild className="cursor-pointer">
            <Link href={`/docs/${doc.id}`}>Open document</Link>
          </Button>
        }
      />
      {open ? (
        <ClassifyDocModal docId={doc.id} open={open} onOpenChange={setOpen} />
      ) : null}
    </>
  )
}

function FailedCard({ doc }: { doc: DocListItem }) {
  return (
    <InboxCard
      tone="red"
      icon={<AlertTriangle className="h-4 w-4" aria-hidden />}
      title={
        <>
          We couldn’t read{' '}
          <span className="text-foreground">&ldquo;{docLabel(doc)}&rdquo;</span>
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
    proposals: safe.filter(
      (d) => d.processingStatus === 'ready' && d.pendingTypeProposal,
    ),
    unclassified: safe.filter(
      (d) =>
        d.processingStatus === 'ready' &&
        !d.documentType &&
        !d.pendingTypeProposal,
    ),
  }
}

export function useInboxCount(): number {
  const docs = useInbox()
  const { failed, proposals, unclassified } = useMemo(
    () => partition(docs.data),
    [docs.data],
  )
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
        {hint ? (
          <span className="text-xs text-muted-foreground">{hint}</span>
        ) : null}
      </header>
      <div className="space-y-3">{children}</div>
    </section>
  )
}

function EmptyInbox() {
  return (
    <div className="rounded-xl border border-dashed bg-card/40 px-6 py-12 text-center">
      <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
        <Inbox className="h-5 w-5" aria-hidden />
      </div>
      <p className="text-sm font-medium">Inbox is clear</p>
      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
        New uploads needing your review will show up here.
      </p>
    </div>
  )
}

export function InboxTab() {
  const docs = useInbox()
  const { failed, proposals, unclassified } = useMemo(
    () => partition(docs.data),
    [docs.data],
  )

  if (docs.isLoading) {
    return (
      <p className="px-1 text-sm italic text-muted-foreground">
        Loading inbox…
      </p>
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
