'use client'

import { Loader2, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
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
import { Input } from '@/components/ui/input'
import { formatRelative } from '@/lib/format-relative'
import { useDocs, useSupersedeDoc } from '@/lib/hooks/use-docs'
import { mapApiError } from '@/lib/map-api-error'
import { cn } from '@/lib/utils'

const SEARCH_DEBOUNCE_MS = 250

// Manual reconcile picker — the operator chooses which older live document this
// one replaces. The chosen doc is archived in place (undoable from its detail
// page). Only live docs are listed (default lifecycle), and the current doc is
// filtered out so it can't supersede itself.
export function SupersedePickerModal({
  docId,
  open,
  onOpenChange,
}: {
  docId: string
  open: boolean
  onOpenChange: (v: boolean) => void
}) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const supersede = useSupersedeDoc()

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [query])

  // Reset transient state whenever the modal reopens.
  useEffect(() => {
    if (open) {
      setQuery('')
      setDebounced('')
      setSelectedId(null)
    }
  }, [open])

  const docs = useDocs({ q: debounced || undefined, status: 'all', sort: 'recent' })
  const items = (docs.data?.pages.flatMap((p) => p.items) ?? []).filter((d) => d.id !== docId)

  async function handleConfirm() {
    if (!selectedId) return
    try {
      await supersede.mutateAsync({ id: docId, replaces: selectedId })
      toast.success('Older version archived')
      onOpenChange(false)
    } catch (err) {
      toast.error(mapApiError(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Replace an older version</DialogTitle>
          <DialogDescription>
            Pick the document this one replaces. It’ll be archived and stop showing up in chat
            answers — you can restore it later.
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search documents…"
            aria-label="Search documents to replace"
            className="pl-9"
          />
        </div>

        <div
          role="listbox"
          aria-label="Documents"
          className="scrollbar-thin max-h-72 overflow-y-auto rounded-lg border"
        >
          {docs.isLoading ? (
            <div className="flex items-center justify-center gap-2 px-4 py-8 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Loading…
            </div>
          ) : items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">
              {debounced ? 'No matching documents.' : 'No other documents to replace.'}
            </p>
          ) : (
            <ul className="divide-y">
              {items.map((d) => {
                const selected = d.id === selectedId
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selected}
                      onClick={() => setSelectedId(d.id)}
                      className={cn(
                        'flex w-full cursor-pointer flex-col items-start gap-0.5 px-3 py-2.5 text-left transition-colors hover:bg-accent/60',
                        selected && 'bg-accent',
                      )}
                    >
                      <span className="truncate text-sm font-medium">
                        {d.title?.trim() || 'Untitled document'}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">
                        {d.venueName ?? 'All venues'} · Updated {formatRelative(d.updatedAt)}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={supersede.isPending}
            className="cursor-pointer"
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!selectedId || supersede.isPending}
            className="cursor-pointer"
          >
            {supersede.isPending ? 'Archiving…' : 'Archive older version'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
