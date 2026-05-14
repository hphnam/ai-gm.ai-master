'use client'

import { ArrowDownUp, FilterX, Loader2, Search, SlidersHorizontal } from 'lucide-react'
import { parseAsString, parseAsStringLiteral, useQueryState, useQueryStates } from 'nuqs'
import { useEffect, useMemo, useRef, useState } from 'react'
import { DocList } from '@/components/docs/doc-list'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useDocs, useDocTypes } from '@/lib/hooks/use-docs'
import { useVenues } from '@/lib/hooks/use-venues'
import { cn } from '@/lib/utils'

type CategoryFilter = 'all' | 'unclassified' | string
type VenueFilter = 'all' | 'global' | string
type StatusFilter = 'all' | 'ready' | 'processing' | 'attention'
type SortKey = 'recent' | 'name' | 'oldest'

const SEARCH_DEBOUNCE_MS = 250

const STATUS_VALUES = ['all', 'ready', 'processing', 'attention'] as const
const SORT_VALUES = ['recent', 'oldest', 'name'] as const

export function LibraryTab() {
  const types = useDocTypes()
  const { data: venues } = useVenues()

  // Filter state lives in URL params via nuqs — shareable, refresh-safe, and
  // persisted across navigation. `q` is throttled separately from typing
  // (see effect below) so the address bar doesn't flicker on every keystroke.
  // `useQueryStates` batches the dropdown filters into a single history entry.
  const [query, setQuery] = useQueryState(
    'q',
    parseAsString.withDefault('').withOptions({ clearOnDefault: true }),
  )
  const [{ category, venue, status, sort }, setFilters] = useQueryStates({
    category: parseAsString.withDefault('all').withOptions({ clearOnDefault: true }),
    venue: parseAsString.withDefault('all').withOptions({ clearOnDefault: true }),
    status: parseAsStringLiteral(STATUS_VALUES)
      .withDefault('all')
      .withOptions({ clearOnDefault: true }),
    sort: parseAsStringLiteral(SORT_VALUES)
      .withDefault('recent')
      .withOptions({ clearOnDefault: true }),
  })

  // Local mirror so typing feels instant; server search lags behind by ~250ms
  // to avoid hammering the API on every keystroke.
  const [debouncedQuery, setDebouncedQuery] = useDebouncedValue(query, SEARCH_DEBOUNCE_MS)
  // Keep debounced value synced when query is reset programmatically (e.g.
  // clearFilters()) — otherwise the stale debounced value lingers.
  useEffect(() => {
    if (query === '') setDebouncedQuery('')
  }, [query, setDebouncedQuery])

  const docs = useDocs({
    q: debouncedQuery || undefined,
    category: (category as CategoryFilter) || 'all',
    venue: (venue as VenueFilter) || 'all',
    status: status as StatusFilter,
    sort: sort as SortKey,
  })

  const filtersActive =
    query.trim().length > 0 || category !== 'all' || venue !== 'all' || status !== 'all'
  // Count only the dropdown filters (search and sort are inline, so they don't
  // count toward the popover's "active" badge).
  const activeDropdownCount =
    (category !== 'all' ? 1 : 0) + (venue !== 'all' ? 1 : 0) + (status !== 'all' ? 1 : 0)

  // Flatten the paginated pages into a single list for rendering.
  const items = useMemo(() => docs.data?.pages.flatMap((p) => p.items) ?? undefined, [docs.data])
  const visible = items?.length ?? 0
  const total = docs.data?.pages[0]?.total ?? 0
  const isInitialLoading = docs.isLoading && !docs.data

  // Infinite-scroll trigger. Watches a sentinel at the bottom of the list and
  // calls fetchNextPage when it scrolls into view. Falls back to a button so
  // keyboard / reduced-motion users can advance explicitly.
  const sentinelRef = useRef<HTMLDivElement | null>(null)
  useEffect(() => {
    const node = sentinelRef.current
    if (!node) return
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && docs.hasNextPage && !docs.isFetchingNextPage) {
            void docs.fetchNextPage()
          }
        }
      },
      { rootMargin: '200px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [docs.hasNextPage, docs.isFetchingNextPage, docs.fetchNextPage, docs])

  function clearFilters() {
    void setQuery('')
    void setFilters({ category: 'all', venue: 'all', status: 'all' })
  }

  return (
    <section aria-label="All documents" className="min-w-0">
      <header className="mb-4 space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-semibold tracking-tight">All documents</h2>
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
              onChange={(e) => void setQuery(e.target.value)}
              placeholder="Search documents…"
              aria-label="Search documents"
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className={cn(
                  'h-8 cursor-pointer gap-1.5',
                  activeDropdownCount > 0 && 'border-foreground/30',
                )}
                aria-label="Filters"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden />
                Filters
                {activeDropdownCount > 0 ? (
                  <span className="ml-0.5 inline-flex h-4 min-w-[16px] items-center justify-center rounded-full bg-foreground/10 px-1 text-[10px] font-medium tabular-nums">
                    {activeDropdownCount}
                  </span>
                ) : null}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-[260px] space-y-3 p-3">
              <div className="space-y-1">
                <label
                  htmlFor="filter-category"
                  className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Category
                </label>
                <Select value={category} onValueChange={(v) => void setFilters({ category: v })}>
                  <SelectTrigger
                    id="filter-category"
                    aria-label="Filter by category"
                    className="h-8 w-full cursor-pointer"
                  >
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    <SelectItem value="unclassified">Not categorized</SelectItem>
                    {types.data && types.data.length > 0
                      ? types.data.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))
                      : null}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="filter-venue"
                  className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Venue
                </label>
                <Select value={venue} onValueChange={(v) => void setFilters({ venue: v })}>
                  <SelectTrigger
                    id="filter-venue"
                    aria-label="Filter by venue"
                    className="h-8 w-full cursor-pointer"
                  >
                    <SelectValue placeholder="Venue" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All venues</SelectItem>
                    <SelectItem value="global">No venue (global)</SelectItem>
                    {(venues ?? []).map((v) => (
                      <SelectItem key={v.id} value={v.id}>
                        {v.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label
                  htmlFor="filter-status"
                  className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground"
                >
                  Status
                </label>
                <Select
                  value={status}
                  onValueChange={(v) => void setFilters({ status: v as StatusFilter })}
                >
                  <SelectTrigger
                    id="filter-status"
                    aria-label="Filter by status"
                    className="h-8 w-full cursor-pointer"
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
              </div>
            </PopoverContent>
          </Popover>

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

          <div className="ml-auto">
            <Select value={sort} onValueChange={(v) => void setFilters({ sort: v as SortKey })}>
              <SelectTrigger aria-label="Sort" className="h-8 w-auto min-w-[9rem] cursor-pointer">
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

      <DocList docs={items} isLoading={isInitialLoading} searchQuery={query.trim() || undefined} />

      {items && items.length === 0 && filtersActive && total > 0 ? (
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

      {/* Load-more affordance. Sentinel triggers IntersectionObserver; the
          button is the keyboard / no-IO fallback. Only renders when more
          pages are available to avoid a sticky empty footer. */}
      {docs.hasNextPage ? (
        <div ref={sentinelRef} className="mt-4 flex justify-center">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => void docs.fetchNextPage()}
            disabled={docs.isFetchingNextPage}
            className="cursor-pointer gap-1.5"
          >
            {docs.isFetchingNextPage ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                Loading more…
              </>
            ) : (
              'Load more'
            )}
          </Button>
        </div>
      ) : null}
    </section>
  )
}

// Debounce wrapper that mirrors useState's API but only updates after `delay`
// of stillness. Returned setter overrides the debounce — callers use it to
// flush immediately (e.g. on clear).
function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(value), delay)
    return () => window.clearTimeout(t)
  }, [value, delay])
  return [debounced, setDebounced] as const
}
