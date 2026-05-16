'use client'

import {
  AlertTriangle,
  BookOpen,
  ClipboardList,
  FileQuestion,
  FileText,
  Loader2,
  Sparkles,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'
import type { DocListItemDto as DocListItem } from '@/generated/api'
import { useDeleteDoc } from '@/lib/hooks/use-docs'
import { mapApiError } from '@/lib/map-api-error'
import { cn } from '@/lib/utils'

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

type StatusTone = 'muted' | 'info' | 'warning' | 'danger'

function statusFor(doc: DocListItem): { text: string; tone: StatusTone } {
  if (doc.processingStatus === 'processing') return { text: 'Reading your document…', tone: 'info' }
  if (doc.processingStatus === 'failed') return { text: 'Couldn’t read this file', tone: 'danger' }
  if (doc.documentType) return { text: doc.documentType.name, tone: 'muted' }
  if (doc.pendingTypeProposal) return { text: 'Awaiting your review', tone: 'warning' }
  return { text: 'Not categorized yet', tone: 'warning' }
}

const toneClass: Record<StatusTone, string> = {
  muted: 'text-muted-foreground',
  info: 'text-muted-foreground',
  warning: 'text-foreground/80 font-medium',
  danger: 'text-destructive font-medium',
}

function DocIcon({ doc }: { doc: DocListItem }) {
  if (doc.processingStatus === 'processing')
    return <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
  if (doc.processingStatus === 'failed') return <AlertTriangle className="h-5 w-5" aria-hidden />
  if (doc.pendingTypeProposal) return <Sparkles className="h-5 w-5" aria-hidden />
  if (doc.documentType?.kind === 'procedural' || doc.isProcedural)
    return <ClipboardList className="h-5 w-5" aria-hidden />
  if (doc.documentType?.kind === 'reference') return <BookOpen className="h-5 w-5" aria-hidden />
  if (!doc.documentType) return <FileQuestion className="h-5 w-5" aria-hidden />
  return <FileText className="h-5 w-5" aria-hidden />
}

function iconWrapClass(doc: DocListItem): string {
  // One restrained wrap; severity comes from the glyph + status text, not
  // from tinted backgrounds. Destructive earns its color because it's a
  // true failure state.
  if (doc.processingStatus === 'failed') return 'bg-destructive/10 text-destructive'
  return 'bg-muted text-muted-foreground'
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
        aria-label="Delete document"
        title="Delete document"
        onClick={() => setOpen(true)}
        className="cursor-pointer rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-destructive focus-visible:opacity-100"
      >
        <Trash2 className="h-4 w-4" aria-hidden />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this document?</DialogTitle>
            <DialogDescription>
              This can’t be undone. The document will be removed from your knowledge base and stop
              showing up in chat answers.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={deleteDoc.isPending}
              className="cursor-pointer"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirm}
              disabled={deleteDoc.isPending}
              className="cursor-pointer"
            >
              {deleteDoc.isPending ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function DocRow({ doc }: { doc: DocListItem }) {
  const status = statusFor(doc)
  const venueLabel = doc.venueName ?? 'All venues'
  const title = doc.title?.trim() || 'Untitled document'

  return (
    <li
      className={cn(
        'group relative flex items-center gap-4 rounded-xl border bg-card px-4 py-3.5 transition-colors hover:border-foreground/20 hover:bg-accent/40',
        doc.processingStatus === 'failed' && 'border-red-500/20',
      )}
    >
      <div
        className={cn(
          'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg',
          iconWrapClass(doc),
        )}
      >
        <DocIcon doc={doc} />
      </div>
      <div className="min-w-0 flex-1">
        <Link
          href={`/docs/${doc.id}`}
          className="block rounded focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <p className="truncate text-sm font-medium text-foreground group-hover:underline group-hover:underline-offset-4 sm:text-[15px]">
            {title}
          </p>
          <p className="mt-0.5 truncate text-xs text-muted-foreground sm:text-sm">
            <span className={toneClass[status.tone]}>{status.text}</span>
            <span className="mx-1.5 text-muted-foreground/40" aria-hidden>
              ·
            </span>
            <span>{venueLabel}</span>
            <span className="mx-1.5 text-muted-foreground/40" aria-hidden>
              ·
            </span>
            <span>Updated {formatRelative(doc.updatedAt)}</span>
          </p>
        </Link>
      </div>
      <div className="ml-2 flex shrink-0 items-center gap-1 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
        <DeleteDocButton doc={doc} />
      </div>
    </li>
  )
}

function DocListSkeleton() {
  return (
    <ul className="space-y-2" aria-busy="true" aria-label="Loading documents">
      {Array.from({ length: 4 }).map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: static skeleton placeholder, no real data
        <li key={i} className="flex items-center gap-4 rounded-xl border bg-card px-4 py-3.5">
          <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-1/3" />
            <Skeleton className="h-3 w-2/3" />
          </div>
        </li>
      ))}
    </ul>
  )
}

export function DocList({
  docs,
  isLoading,
  searchQuery,
}: {
  docs: DocListItem[] | undefined
  isLoading: boolean
  searchQuery?: string
}) {
  if (isLoading) return <DocListSkeleton />

  if (!docs || docs.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card/40 px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          {searchQuery ? `No documents match “${searchQuery}”.` : 'No documents yet.'}
        </p>
      </div>
    )
  }

  return (
    <ul className="space-y-2">
      {docs.map((d) => (
        <DocRow key={d.id} doc={d} />
      ))}
    </ul>
  )
}
