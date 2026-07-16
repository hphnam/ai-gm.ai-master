'use client'

import { Check, ChevronDown, MapPin, Plus, RotateCcw, Store } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { EmptyState } from '@/components/ui/empty-state'
import { Skeleton } from '@/components/ui/skeleton'
import { useVenue, useVenues } from '@/lib/hooks/use-venues'
import { cn } from '@/lib/utils'
import { VenueProfileEditor } from './venue-profile-editor'

export function VenueProfilesBody({ isManager }: { isManager: boolean }) {
  const venues = useVenues()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  // Fall back to the first venue during render rather than writing derived state in an effect.
  const activeId = selectedId ?? venues.data?.[0]?.id ?? null

  const detail = useVenue(activeId)

  if (venues.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full rounded-lg" />
        <Skeleton className="h-48 w-full rounded-lg" />
      </div>
    )
  }

  if (!venues.data || venues.data.length === 0) {
    return (
      <EmptyState
        icon={Store}
        size="compact"
        title="No venues yet"
        description="Create your first venue to start adding context the AI can read."
        action={
          isManager ? (
            <Button asChild size="sm" className="cursor-pointer gap-1.5">
              <Link href="/venues/new">
                <Plus className="h-3.5 w-3.5" aria-hidden />
                New venue
              </Link>
            </Button>
          ) : undefined
        }
      />
    )
  }

  const activeVenue = venues.data.find((v) => v.id === activeId) ?? venues.data[0]

  return (
    <div className="space-y-5">
      <VenuePicker
        venues={venues.data}
        activeId={activeVenue.id}
        onSelect={setSelectedId}
        isManager={isManager}
      />

      {isManager ? (
        <div className="-mt-3 flex justify-end">
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="min-h-11 gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <Link href={`/welcome?venueId=${activeVenue.id}&step=basics`}>
              <RotateCcw className="h-3.5 w-3.5" aria-hidden />
              Re-run guided setup
            </Link>
          </Button>
        </div>
      ) : null}

      {detail.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      ) : detail.data ? (
        <VenueProfileEditor key={detail.data.id} venue={detail.data} isManager={isManager} />
      ) : null}
    </div>
  )
}

function VenuePicker({
  venues,
  activeId,
  onSelect,
  isManager,
}: {
  venues: Array<{ id: string; name: string; address?: string | null }>
  activeId: string
  onSelect: (id: string) => void
  isManager: boolean
}) {
  const active = venues.find((v) => v.id === activeId)
  if (!active) return null
  const count = venues.length

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Switch venue — currently editing ${active.name}`}
          className={cn(
            'group flex w-full cursor-pointer items-center gap-3 rounded-xl border bg-card px-4 py-3 text-left shadow-sm transition-colors',
            'hover:border-foreground/30',
          )}
        >
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground"
            aria-hidden
          >
            <Store className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-mono-ledger text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--mono-muted)]">
              Editing
            </p>
            <p className="truncate text-sm font-medium text-foreground">{active.name}</p>
            {active.address ? (
              <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" aria-hidden />
                <span className="truncate">{active.address}</span>
              </p>
            ) : null}
          </div>
          <span className="flex shrink-0 items-center gap-2 text-xs text-muted-foreground">
            <span className="tabular-nums">
              {count} {count === 1 ? 'venue' : 'venues'}
            </span>
            <ChevronDown
              className="h-4 w-4 transition-transform group-data-[state=open]:rotate-180"
              aria-hidden
            />
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[280px]"
      >
        <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
          {count === 1 ? 'Your venue' : 'Switch venue'}
        </DropdownMenuLabel>
        {venues.map((v) => (
          <DropdownMenuItem
            key={v.id}
            onSelect={(e) => {
              e.preventDefault()
              onSelect(v.id)
            }}
            className="flex items-start gap-2"
          >
            <Store className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-sm font-medium">{v.name}</span>
              {v.address ? (
                <span className="truncate text-xs text-muted-foreground">{v.address}</span>
              ) : null}
            </span>
            {v.id === activeId ? (
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" aria-hidden />
            ) : null}
          </DropdownMenuItem>
        ))}
        {isManager ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/venues/new" className="flex items-center gap-2">
                <Plus className="h-4 w-4" aria-hidden />
                New venue
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
