'use client'

import { ArrowLeft, Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { type Recipient, useNotificationRecipients } from '@/lib/hooks/use-notifications'
import { initials, ListSkeleton } from '../notifications-shared'

export function NewConversationPicker({
  onBack,
  onPick,
}: {
  onBack: () => void
  onPick: (r: Recipient) => void
}) {
  const { data, isLoading } = useNotificationRecipients({ enabled: true })
  const [query, setQuery] = useState('')
  const members = data?.members ?? []
  // Focus the search input once on mount. An inline ref callback would re-fire
  // on every render (the arrow's identity changes each pass) and yank focus
  // off mid-typing — that breaks IME composition for CJK input.
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return members
    return members.filter(
      (m) => (m.name?.toLowerCase().includes(q) ?? false) || m.email.toLowerCase().includes(q),
    )
  }, [members, query])

  return (
    <>
      <div className="flex items-center gap-2 border-b border-[var(--hairline)] px-4 py-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-[var(--mono-muted)] transition-colors hover:bg-[var(--paper-2)] hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          aria-label="Back to conversations"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
        </button>
        <h2 className="font-bold text-base text-foreground tracking-[-0.01em]">New conversation</h2>
      </div>

      <div className="border-b border-[var(--hairline)] px-4 py-2.5">
        <div className="relative">
          <Search
            className="-translate-y-1/2 pointer-events-none absolute top-1/2 left-2.5 h-3.5 w-3.5 text-[var(--ink-faint)]"
            aria-hidden
          />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search people in your org"
            className="w-full rounded-lg border border-[var(--hairline)] bg-[var(--ledger-card)] py-2 pr-2 pl-8 text-sm placeholder:text-[var(--ink-faint)] focus:border-[var(--brass)]/40 focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
        </div>
      </div>

      <div className="scrollbar-thin flex-1 overflow-y-auto">
        {isLoading ? (
          <ListSkeleton />
        ) : filtered.length === 0 ? (
          <p className="px-4 py-8 text-center text-[var(--ink-muted)] text-sm">No matches.</p>
        ) : (
          <ul className="flex flex-col">
            {filtered.map((m) => (
              <li key={m.userId} className="border-b border-[var(--hairline-soft)] last:border-b-0">
                <button
                  type="button"
                  onClick={() => onPick(m)}
                  className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-[var(--paper-2)]/50"
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--hairline)] bg-[var(--paper-2)] font-semibold text-[10px] text-[#6b6250] uppercase tracking-tight">
                    {initials(m)}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold text-foreground text-sm">
                      {m.name ?? m.email}
                    </span>
                    {m.name ? (
                      <span className="truncate text-[10px] text-[var(--mono-muted)]">
                        {m.email}
                      </span>
                    ) : null}
                  </div>
                  <span className="shrink-0 rounded font-mono-ledger bg-[var(--paper-2)] px-1.5 py-0.5 text-[10px] text-[var(--ink-muted)] uppercase tracking-wider">
                    {m.role}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
