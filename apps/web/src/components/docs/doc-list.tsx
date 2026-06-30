'use client'

import { useVirtualizer } from '@tanstack/react-virtual'
import {
  AlertTriangle,
  Archive,
  BookOpen,
  ClipboardList,
  FileQuestion,
  FileText,
  Loader2,
  Sparkles,
  Trash2,
} from 'lucide-react'
import Link from 'next/link'
import { useCallback, useState } from 'react'
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
import { formatRelative } from '@/lib/format-relative'
import { useDeleteDoc } from '@/lib/hooks/use-docs'
import { mapApiError } from '@/lib/map-api-error'
import { cn } from '@/lib/utils'

type StatusTone = 'muted' | 'info' | 'warning' | 'danger'

function statusFor(doc: DocListItem): { text: string; tone: StatusTone } {
  if (doc.supersededAt) return { text: 'Archived — replaced by a newer version', tone: 'muted' }
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
  if (doc.supersededAt) return <Archive className="h-5 w-5" aria-hidden />
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
    <div
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
    </div>
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

// Card height (~68px) plus the 8px inter-row gap baked into each wrapper's
// bottom padding. Only the initial estimate — rows re-measure on mount.
const ROW_ESTIMATE_PX = 76

// The docs page scrolls through an ancestor container (see docs-body.tsx), not
// a container owned by this list, so the virtualizer reads that ancestor as its
// scroll element and offsets item positions by the list's distance from the
// scroll origin (scrollMargin). Keeping the list at full height preserves the
// load-more sentinel that lives just below it in library-tab.tsx.
function getScrollParent(node: HTMLElement): HTMLElement | null {
  let el: HTMLElement | null = node.parentElement
  while (el) {
    const overflowY = getComputedStyle(el).overflowY
    if (overflowY === 'auto' || overflowY === 'scroll') return el
    el = el.parentElement
  }
  return null
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
  const rows = docs ?? []
  const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null)
  const [scrollMargin, setScrollMargin] = useState(0)

  // Callback ref: the list mounts only once data arrives (after the loading /
  // empty branches), so a layout effect with [] deps would miss it. Computing
  // here runs synchronously when the <ul> attaches.
  const measureLayout = useCallback((node: HTMLUListElement | null) => {
    if (!node) return
    const parent = getScrollParent(node)
    setScrollEl(parent)
    if (parent) {
      setScrollMargin(
        node.getBoundingClientRect().top - parent.getBoundingClientRect().top + parent.scrollTop,
      )
    }
  }, [])

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollEl,
    estimateSize: () => ROW_ESTIMATE_PX,
    overscan: 8,
    scrollMargin,
    getItemKey: (i) => rows[i]?.id ?? i,
  })

  if (isLoading) return <DocListSkeleton />

  if (rows.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-card/40 px-6 py-10 text-center">
        <p className="text-sm text-muted-foreground">
          {searchQuery ? `No documents match “${searchQuery}”.` : 'No documents yet.'}
        </p>
      </div>
    )
  }

  return (
    <ul
      ref={measureLayout}
      className="relative list-none"
      style={{ height: virtualizer.getTotalSize() }}
    >
      {virtualizer.getVirtualItems().map((vi) => {
        const d = rows[vi.index]
        if (!d) return null
        return (
          <li
            key={vi.key}
            ref={virtualizer.measureElement}
            data-index={vi.index}
            className="absolute inset-x-0 top-0 pb-2"
            style={{ transform: `translateY(${vi.start - scrollMargin}px)` }}
          >
            <DocRow doc={d} />
          </li>
        )
      })}
    </ul>
  )
}
