'use client'

import { Loader2 } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useVenue, useVenues } from '@/lib/hooks/use-venues'
import { cn } from '@/lib/utils'
import { VenueProfileEditor } from './venue-profile-editor'

export function VenueProfilesBody() {
  const venues = useVenues()
  const [selectedId, setSelectedId] = useState<string | null>(null)

  // Auto-select first venue once loaded.
  useEffect(() => {
    if (!selectedId && venues.data && venues.data.length > 0) {
      setSelectedId(venues.data[0].id)
    }
  }, [venues.data, selectedId])

  const detail = useVenue(selectedId)

  if (venues.isLoading) {
    return (
      <div className="flex items-center justify-center py-12 text-sm text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading venues…
      </div>
    )
  }

  if (!venues.data || venues.data.length === 0) {
    return (
      <div className="rounded-lg border bg-card p-6 text-center text-sm text-muted-foreground">
        No venues yet. Create one from the venues page first.
      </div>
    )
  }

  return (
    <div className="space-y-5">
      {venues.data.length > 1 ? (
        <div className="-mx-2 flex gap-1 overflow-x-auto px-2 pb-1">
          {venues.data.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => setSelectedId(v.id)}
              className={cn(
                'shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                selectedId === v.id
                  ? 'border-brand bg-brand text-brand-foreground'
                  : 'border-border bg-background text-muted-foreground hover:border-foreground/30 hover:text-foreground',
              )}
            >
              {v.name}
            </button>
          ))}
        </div>
      ) : null}

      {detail.isLoading ? (
        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading profile…
        </div>
      ) : detail.data ? (
        <VenueProfileEditor key={detail.data.id} venue={detail.data} />
      ) : null}
    </div>
  )
}
