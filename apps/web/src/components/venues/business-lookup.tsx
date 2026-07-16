'use client'

import { Loader2, MapPin, Search } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { type PlaceCandidate, usePlacesSearch } from '@/lib/hooks/use-places-search'

const SEARCH_DEBOUNCE_MS = 400

export type { PlaceCandidate }

export function BusinessLookup({
  onSelect,
  onManual,
  onUnavailable,
  disabled,
}: {
  onSelect: (candidate: PlaceCandidate) => void
  onManual?: () => void
  onUnavailable: () => void
  disabled?: boolean
}) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')

  useEffect(() => {
    const t = window.setTimeout(() => setDebounced(query.trim()), SEARCH_DEBOUNCE_MS)
    return () => window.clearTimeout(t)
  }, [query])

  const search = usePlacesSearch(debounced)
  const data = search.data

  useEffect(() => {
    if (data?.available === false) onUnavailable()
  }, [data, onUnavailable])

  const searching = search.isFetching || (Boolean(debounced) && query.trim() !== debounced)
  const candidates = data?.available ? data.candidates : []
  const showEmpty = Boolean(debounced) && !searching && data?.available && candidates.length === 0
  const showError = !searching && (search.isError || data?.error === 'lookup-failed')

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <Label htmlFor="business-lookup">Find your business</Label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            id="business-lookup"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name and town — e.g. The Crown, Camden"
            className="pl-9"
            disabled={disabled}
            autoFocus
            autoComplete="off"
          />
          {searching ? (
            <Loader2
              className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground"
              aria-hidden
            />
          ) : null}
        </div>
      </div>

      {candidates.length > 0 ? (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
          {candidates.map((c) => (
            <li key={c.placeId}>
              <button
                type="button"
                onClick={() => onSelect(c)}
                disabled={disabled}
                className="flex min-h-11 w-full cursor-pointer items-start gap-3 px-3 py-2.5 text-left transition-colors hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
              >
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-foreground">
                    {c.name}
                    {c.businessType ? (
                      <span className="ml-2 font-normal text-muted-foreground">
                        {c.businessType}
                      </span>
                    ) : null}
                  </span>
                  {c.address ? (
                    <span className="block truncate text-xs text-muted-foreground">
                      {c.address}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {candidates.length > 0 ? (
        <p className="text-xs text-[var(--mono-muted)]">
          Powered by Google Business Profile · pick your venue to autofill its name and address.
        </p>
      ) : null}

      {showEmpty ? (
        <p className="text-sm text-muted-foreground">
          No matches found — try adding the town, or enter details manually.
        </p>
      ) : null}
      {showError ? (
        <p className="text-sm text-muted-foreground">
          Search isn&rsquo;t available right now — enter details manually below.
        </p>
      ) : null}

      {onManual ? (
        <button
          type="button"
          onClick={onManual}
          disabled={disabled}
          className="inline-flex min-h-11 cursor-pointer items-center rounded-sm text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          Enter details manually
        </button>
      ) : null}
    </div>
  )
}
