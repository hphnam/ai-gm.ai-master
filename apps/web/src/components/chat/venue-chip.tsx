'use client'

import { Check, ChevronDown, Plus, Store } from 'lucide-react'
import Link from 'next/link'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useVenues } from '@/lib/hooks/use-venues'
import { cn } from '@/lib/utils'

type Props = {
  venueId: string | null
  /** When undefined, the chip renders as a read-only label (shared chats). */
  onChange?: (venueId: string) => void
}

// Compact venue switcher that lives in the chat PageHeader. Replaces the
// full-width VenueStrip that used to sit above the composer.
export function VenueChip({ venueId, onChange }: Props) {
  const { data: venues, isLoading } = useVenues()
  const current = venues?.find((v) => v.id === venueId) ?? null
  const needsPick = Boolean(onChange) && !current
  const readOnly = !onChange

  const label = isLoading
    ? 'Loading…'
    : current
      ? current.name
      : readOnly
        ? 'Unknown venue'
        : 'Pick a venue'

  const Inner = (
    <>
      <Store
        className={cn('h-3.5 w-3.5', needsPick ? 'text-brand' : 'text-muted-foreground')}
        aria-hidden
      />
      <span
        className={cn(
          'max-w-[140px] truncate sm:max-w-[200px]',
          needsPick ? 'text-brand' : 'text-foreground',
        )}
      >
        {label}
      </span>
      {!readOnly ? (
        <ChevronDown
          className={cn('h-3.5 w-3.5', needsPick ? 'text-brand' : 'text-muted-foreground')}
          aria-hidden
        />
      ) : null}
    </>
  )

  if (readOnly) {
    return (
      <span
        className={cn(
          'inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2 py-1 text-xs font-medium',
        )}
      >
        {Inner}
      </span>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Pick venue for this chat"
          className={cn(
            'inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium transition-colors',
            needsPick
              ? 'border-brand/50 bg-brand/5 hover:bg-brand/10'
              : 'border-border bg-card hover:bg-accent',
          )}
        >
          {Inner}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-[240px]">
        <DropdownMenuLabel className="text-xs uppercase tracking-wide text-muted-foreground">
          Venue for this chat
        </DropdownMenuLabel>
        {venues && venues.length > 0 ? (
          venues.map((v) => (
            <DropdownMenuItem
              key={v.id}
              onSelect={(e) => {
                e.preventDefault()
                onChange?.(v.id)
              }}
              className="flex items-start gap-2"
            >
              <Store className="mt-0.5 h-4 w-4 text-muted-foreground" aria-hidden />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium">{v.name}</span>
                {v.address ? (
                  <span className="truncate text-xs text-muted-foreground">{v.address}</span>
                ) : null}
              </span>
              {v.id === venueId ? (
                <Check className="mt-0.5 h-4 w-4 text-brand" aria-hidden />
              ) : null}
            </DropdownMenuItem>
          ))
        ) : (
          <div className="px-2 py-3 text-sm text-muted-foreground">No venues yet.</div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/venues/new" className="flex items-center gap-2">
            <Plus className="h-4 w-4" aria-hidden />
            New venue
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
