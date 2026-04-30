'use client'

import { useMemo, useState } from 'react'
import { ArrowDownUp, FilterX, Search } from 'lucide-react'
import type { DocListItemDto as DocListItem } from '@/generated/api'
import { DocList } from '@/components/docs/doc-list'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDocs, useDocTypes } from '@/lib/hooks/use-docs'

type CategoryFilter = 'all' | 'unclassified' | string
type VenueFilter = 'all' | 'global' | string
type StatusFilter = 'all' | 'ready' | 'processing' | 'attention'
type SortKey = 'recent' | 'name' | 'oldest'

function matchesQuery(
  haystacks: Array<string | null | undefined>,
  q: string,
): boolean {
  const needle = q.toLowerCase()
  return haystacks.some((h) => (h ?? '').toLowerCase().includes(needle))
}

function statusOf(d: DocListItem): 'ready' | 'processing' | 'attention' {
  if (d.processingStatus === 'processing') return 'processing'
  if (d.processingStatus === 'failed') return 'attention'
  if (!d.documentType) return 'attention' // unclassified or pending proposal
  return 'ready'
}

export function LibraryTab() {
  const docs = useDocs()
  const types = useDocTypes()

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('all')
  const [venue, setVenue] = useState<VenueFilter>('all')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [sort, setSort] = useState<SortKey>('recent')

  // Derive venue options from the doc set so filters reflect what you actually have.
  const venueOptions = useMemo(() => {
    if (!docs.data) return [] as Array<{ id: string; name: string }>
    const seen = new Map<string, string>()
    for (const d of docs.data) {
      if (d.venueId && d.venueName && !seen.has(d.venueId)) {
        seen.set(d.venueId, d.venueName)
      }
    }
    return Array.from(seen, ([id, name]) => ({ id, name })).sort((a, b) =>
      a.name.localeCompare(b.name),
    )
  }, [docs.data])

  const filtersActive =
    query.trim().length > 0 ||
    category !== 'all' ||
    venue !== 'all' ||
    status !== 'all'

  const filtered = useMemo(() => {
    if (!docs.data) return undefined
    let list = docs.data

    if (category === 'unclassified') {
      list = list.filter((d) => !d.documentType)
    } else if (category !== 'all') {
      list = list.filter((d) => d.documentType?.id === category)
    }

    if (venue === 'global') {
      list = list.filter((d) => !d.venueId)
    } else if (venue !== 'all') {
      list = list.filter((d) => d.venueId === venue)
    }

    if (status !== 'all') {
      list = list.filter((d) => statusOf(d) === status)
    }

    const q = query.trim()
    if (q) {
      list = list.filter((d) =>
        matchesQuery(
          [
            d.title,
            d.summary,
            d.contentPreview,
            d.venueName,
            d.documentType?.name,
            d.pendingTypeProposal?.name,
            ...d.tags,
          ],
          q,
        ),
      )
    }

    const sorted = [...list]
    if (sort === 'recent') {
      sorted.sort(
        (a, b) =>
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      )
    } else if (sort === 'oldest') {
      sorted.sort(
        (a, b) =>
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
      )
    } else if (sort === 'name') {
      sorted.sort((a, b) => {
        const an = (a.title ?? '').trim() || 'Untitled document'
        const bn = (b.title ?? '').trim() || 'Untitled document'
        return an.localeCompare(bn)
      })
    }
    return sorted
  }, [docs.data, query, category, venue, status, sort])

  const total = docs.data?.length ?? 0
  const visible = filtered?.length ?? 0

  function clearFilters() {
    setQuery('')
    setCategory('all')
    setVenue('all')
    setStatus('all')
  }

  return (
    <section aria-label="All documents" className="min-w-0">
      <header className="mb-4 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight">
              All documents
            </h2>
            <p className="text-xs text-muted-foreground">
              {docs.isLoading
                ? 'Loading…'
                : total === 0
                  ? 'Nothing here yet'
                  : filtersActive
                    ? `${visible} of ${total} shown`
                    : `${total} ${total === 1 ? 'document' : 'documents'} in your knowledge base`}
            </p>
          </div>
          <div className="relative w-full sm:max-w-xs">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search documents…"
              aria-label="Search documents"
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={category}
            onValueChange={(v) => setCategory(v as CategoryFilter)}
          >
            <SelectTrigger
              aria-label="Filter by category"
              className="h-8 w-auto min-w-[10rem] cursor-pointer"
            >
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              <SelectItem value="unclassified">Not categorized</SelectItem>
              {types.data && types.data.length > 0 ? (
                types.data.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name}
                  </SelectItem>
                ))
              ) : null}
            </SelectContent>
          </Select>

          <Select
            value={venue}
            onValueChange={(v) => setVenue(v as VenueFilter)}
          >
            <SelectTrigger
              aria-label="Filter by venue"
              className="h-8 w-auto min-w-[8rem] cursor-pointer"
            >
              <SelectValue placeholder="Venue" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All venues</SelectItem>
              <SelectItem value="global">No venue (global)</SelectItem>
              {venueOptions.map((v) => (
                <SelectItem key={v.id} value={v.id}>
                  {v.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select
            value={status}
            onValueChange={(v) => setStatus(v as StatusFilter)}
          >
            <SelectTrigger
              aria-label="Filter by status"
              className="h-8 w-auto min-w-[8rem] cursor-pointer"
            >
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="ready">Ready</SelectItem>
              <SelectItem value="processing">Processing</SelectItem>
              <SelectItem value="attention">Needs attention</SelectItem>
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-2">
            {filtersActive ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={clearFilters}
                className="h-8 cursor-pointer gap-1.5 text-xs text-muted-foreground hover:text-foreground"
              >
                <FilterX className="h-3.5 w-3.5" aria-hidden />
                Clear
              </Button>
            ) : null}
            <Select
              value={sort}
              onValueChange={(v) => setSort(v as SortKey)}
            >
              <SelectTrigger
                aria-label="Sort"
                className="h-8 w-auto min-w-[9rem] cursor-pointer"
              >
                <ArrowDownUp className="mr-1 h-3.5 w-3.5 text-muted-foreground" aria-hidden />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="recent">Recently updated</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="name">Name (A–Z)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </header>

      <DocList
        docs={filtered}
        isLoading={docs.isLoading}
        searchQuery={query.trim() || undefined}
      />

      {filtered && filtered.length === 0 && filtersActive && total > 0 ? (
        <div className="mt-3 flex justify-center">
          <Button
            size="sm"
            variant="outline"
            onClick={clearFilters}
            className="cursor-pointer gap-1.5"
          >
            <FilterX className="h-4 w-4" aria-hidden />
            Clear filters
          </Button>
        </div>
      ) : null}
    </section>
  )
}
