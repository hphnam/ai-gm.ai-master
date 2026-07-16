'use client'

import { Search, X } from 'lucide-react'

export function AlertsSearch({
  query,
  onQueryChange,
}: {
  query: string
  onQueryChange: (v: string) => void
}) {
  return (
    <div className="border-b border-[var(--hairline)] px-4 py-2.5">
      <div className="relative">
        <Search
          className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 text-[var(--ink-faint)]"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search alerts"
          aria-label="Search alerts"
          className="w-full rounded-lg border border-[var(--hairline)] bg-[var(--ledger-card)] py-2 pr-7 pl-8 text-sm placeholder:text-[var(--ink-faint)] focus:border-[var(--brass)]/40 focus:outline-none focus:ring-2 focus:ring-brand/20"
        />
        {query ? (
          <button
            type="button"
            onClick={() => onQueryChange('')}
            aria-label="Clear search"
            className="-translate-y-1/2 absolute top-1/2 right-1.5 inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded text-[var(--ink-faint)] hover:bg-[var(--paper-2)] hover:text-foreground"
          >
            <X className="h-3 w-3" aria-hidden />
          </button>
        ) : null}
      </div>
    </div>
  )
}
