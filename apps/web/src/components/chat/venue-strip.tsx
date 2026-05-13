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
  /** true → read-only (existing thread, venue locked). */
  locked?: boolean
  onChange?: (venueId: string) => void
}

export function VenueStrip({ venueId, locked = false, onChange }: Props) {
  const { data: venues, isLoading } = useVenues()
  const current = venues?.find((v) => v.id === venueId) ?? null
  const needsPick = !locked && !current

  const label = isLoading
    ? 'Loading…'
    : current
      ? current.name
      : locked
        ? 'Unknown venue'
        : 'Pick a venue'

  const Wrapper = ({ children }: { children: React.ReactNode }) => (
    <div
      className={cn(
        'flex items-center gap-2 rounded-xl border px-3 py-2',
        needsPick ? 'border-brand/40 bg-brand/5' : 'border-border bg-muted/40',
      )}
    >
      {children}
    </div>
  )

  const LeadingIcon = (
    <span
      className={cn(
        'flex h-6 w-6 shrink-0 items-center justify-center rounded-md',
        needsPick ? 'bg-brand text-brand-foreground' : 'bg-background text-brand',
      )}
    >
      <Store className="h-3.5 w-3.5" aria-hidden />
    </span>
  )

  const Prefix = (
    <span className="text-xs font-medium text-muted-foreground">
      {locked ? 'Chatting about' : needsPick ? 'Before we start' : 'Chatting about'}
    </span>
  )

  if (locked) {
    return (
      <Wrapper>
        {LeadingIcon}
        <span className="flex min-w-0 flex-col leading-tight">
          {Prefix}
          <span className="truncate text-sm font-semibold text-foreground">{label}</span>
        </span>
      </Wrapper>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label="Pick venue for this chat"
          className={cn(
            'flex w-full items-center gap-2 rounded-xl border px-3 py-2 text-left transition-colors cursor-pointer',
            needsPick
              ? 'border-brand/50 bg-brand/5 hover:bg-brand/10 shadow-sm'
              : 'border-border bg-muted/40 hover:bg-muted/70',
          )}
        >
          {LeadingIcon}
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            {Prefix}
            <span
              className={cn(
                'truncate text-sm font-semibold',
                needsPick ? 'text-brand' : 'text-foreground',
              )}
            >
              {label}
            </span>
          </span>
          <ChevronDown
            className={cn('h-4 w-4', needsPick ? 'text-brand' : 'text-muted-foreground')}
            aria-hidden
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        className="w-[var(--radix-dropdown-menu-trigger-width)] min-w-[240px]"
      >
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
