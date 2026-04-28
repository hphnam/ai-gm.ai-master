'use client'

import { useState } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import { AlertTriangle, CheckSquare, Loader2, Trash2 } from 'lucide-react'
import type { DocListItemDto as DocListItem } from '@/generated/api'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useDeleteDoc } from '@/lib/hooks/use-docs'
import { mapApiError } from '@/lib/map-api-error'
import { DocTypeProposalModal } from '@/components/docs/doc-type-proposal-modal'
import { ClassifyDocModal } from '@/components/docs/classify-doc-modal'

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

function DeleteDocButton({ doc }: { doc: DocListItem }) {
  const [open, setOpen] = useState(false)
  const deleteDoc = useDeleteDoc()

  async function handleConfirm() {
    try {
      await deleteDoc.mutateAsync(doc.id)
      toast.success('Deleted')
      setOpen(false)
    } catch (err) {
      toast.error(mapApiError(err))
    }
  }

  return (
    <>
      <button
        type="button"
        aria-label="Delete doc"
        onClick={() => setOpen(true)}
        className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-muted/50 transition-colors"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this doc?</DialogTitle>
            <DialogDescription>
              This cannot be undone. The knowledge item will be removed from the
              knowledge base and stop appearing in chat results.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={deleteDoc.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={deleteDoc.isPending}
            >
              {deleteDoc.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

// Processing + failed badges. Rendered on the row header alongside taxonomy
// while enrichment is in flight or has errored.
function ProcessingBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-sky-500/15 text-sky-700 dark:text-sky-300 border border-sky-500/30 font-medium"
      aria-live="polite"
    >
      <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
      Processing…
    </span>
  )
}

function FailedBadge({ error }: { error: string | null }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-destructive/15 text-destructive border border-destructive/30 font-medium"
      title={error ?? 'Processing failed'}
    >
      <AlertTriangle className="h-3 w-3" aria-hidden />
      Processing failed
    </span>
  )
}

// Plan 04-03 Task 3 — procedural indicator shown alongside the TaxonomyBadge
// when documentType.kind === 'procedural'. Icon+text per 05-02 WCAG AA decision
// (never icon-only). Amber hue is distinct from the emerald DocumentType badge.
function ProceduralIndicator() {
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 font-medium"
      aria-label="Procedural document"
    >
      <CheckSquare className="h-3 w-3" aria-hidden />
      Procedural
    </span>
  )
}

// Plan 04-02 Task 3 — per-row taxonomy state: confirmed type / pending proposal / unclassified.
function TaxonomyBadge({ doc }: { doc: DocListItem }) {
  const [open, setOpen] = useState(false)

  if (doc.documentType) {
    return (
      <span
        className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-medium"
        title={doc.documentType.description ?? undefined}
      >
        {doc.documentType.name}
      </span>
    )
  }
  if (doc.pendingTypeProposal) {
    return (
      <>
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 font-medium hover:bg-amber-500/25 transition-colors"
          aria-label={`Review proposed type "${doc.pendingTypeProposal.name}"`}
        >
          Pending: {doc.pendingTypeProposal.name}
        </button>
        {open ? (
          <DocTypeProposalModal
            docId={doc.id}
            proposal={doc.pendingTypeProposal}
            open={open}
            onOpenChange={setOpen}
          />
        ) : null}
      </>
    )
  }
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-[11px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground border hover:bg-accent hover:text-foreground transition-colors"
        aria-label="Classify this document"
      >
        Unclassified · classify
      </button>
      {open ? (
        <ClassifyDocModal docId={doc.id} open={open} onOpenChange={setOpen} />
      ) : null}
    </>
  )
}

export function DocList({
  docs,
  isLoading,
}: {
  docs: DocListItem[] | undefined
  isLoading: boolean
}) {
  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground italic">Loading docs…</p>
    )
  }
  if (!docs || docs.length === 0) {
    return (
      <div className="rounded-md border border-dashed p-6 text-center">
        <p className="text-sm text-muted-foreground">
          No docs yet. Add one using the form to seed your knowledge base.
        </p>
      </div>
    )
  }
  return (
    <ul className="space-y-3">
      {docs.map((d) => (
        <li
          key={d.id}
          className="rounded-md border bg-card p-4 space-y-2 hover:border-foreground/30 transition-colors"
        >
          <header className="flex flex-wrap items-baseline gap-2">
            <h3 className="text-sm font-semibold truncate">
              <Link href={`/docs/${d.id}`} className="hover:underline underline-offset-4">
                {d.title ?? d.documentType?.name ?? d.docType ?? 'Untitled'}
              </Link>
            </h3>
            {d.processingStatus === 'processing' ? (
              <ProcessingBadge />
            ) : d.processingStatus === 'failed' ? (
              <FailedBadge error={d.processingError} />
            ) : (
              <>
                <TaxonomyBadge doc={d} />
                {d.isProcedural ? <ProceduralIndicator /> : null}
                {d.docType ? (
                  <span className="text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                    {d.docType}
                  </span>
                ) : null}
              </>
            )}
            <span className="ml-auto text-xs text-muted-foreground">
              {formatRelative(d.updatedAt)}
            </span>
            <DeleteDocButton doc={d} />
          </header>
          <p className="text-sm text-muted-foreground line-clamp-2 whitespace-pre-wrap">
            {d.summary ?? d.contentPreview}
          </p>
          <footer className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {d.venueName ? (
              <span className="px-1.5 py-0.5 rounded bg-muted">{d.venueName}</span>
            ) : (
              <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-900">
                Global
              </span>
            )}
            {d.tags.slice(0, 5).map((t) => (
              <span key={t} className="px-1.5 py-0.5 rounded bg-muted">
                #{t}
              </span>
            ))}
            {d.tags.length > 5 ? (
              <span>+{d.tags.length - 5} more</span>
            ) : null}
          </footer>
        </li>
      ))}
    </ul>
  )
}
