'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { DocList } from '@/components/docs/doc-list'
import { Input } from '@/components/ui/input'
import { useDocs } from '@/lib/hooks/use-docs'

function matchesQuery(
  haystacks: Array<string | null | undefined>,
  q: string,
): boolean {
  const needle = q.toLowerCase()
  return haystacks.some((h) => (h ?? '').toLowerCase().includes(needle))
}

export function LibraryTab() {
  const docs = useDocs()
  const [query, setQuery] = useState('')

  const filtered = useMemo(() => {
    if (!docs.data) return undefined
    const q = query.trim()
    if (!q) return docs.data
    return docs.data.filter((d) =>
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
  }, [docs.data, query])

  const total = docs.data?.length ?? 0

  return (
    <section aria-label="All documents" className="min-w-0">
      <header className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-base font-semibold tracking-tight">
            All documents
          </h2>
          <p className="text-xs text-muted-foreground">
            {docs.isLoading
              ? 'Loading…'
              : total === 0
                ? 'Nothing here yet'
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
      </header>

      <DocList
        docs={filtered}
        isLoading={docs.isLoading}
        searchQuery={query.trim() || undefined}
      />
    </section>
  )
}
