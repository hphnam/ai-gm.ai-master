'use client'

import { Check } from 'lucide-react'
import { useVenues } from '@/lib/hooks/use-venues'
import { cn } from '@/lib/utils'

// Value semantics match the API: an empty array means "all venues". A non-empty
// array restricts to exactly those venue ids. Owners are never scoped, so this
// picker is only shown for manager/staff invites and members.
export function VenueAccessPicker({
  value,
  onChange,
  disabled,
}: {
  value: string[]
  onChange: (venueIds: string[]) => void
  disabled?: boolean
}) {
  const { data: venues } = useVenues()
  const list = venues ?? []
  const allVenues = value.length === 0

  // Only meaningful with more than one venue — a single-site org has nothing to
  // scope, so the caller hides this entirely (see shouldShowVenueAccess).
  function toggle(id: string) {
    if (allVenues) {
      // Switching from "all" to a specific pick starts from just this venue.
      onChange([id])
      return
    }
    // Never let "Specific" empty out — an empty array means "all venues", so
    // unchecking the last one would silently widen access. Use the "All venues"
    // toggle for that instead.
    if (value.includes(id)) {
      if (value.length === 1) return
      onChange(value.filter((v) => v !== id))
      return
    }
    onChange([...value, id])
  }

  return (
    <div className="space-y-2">
      <div className="inline-flex rounded-md border bg-muted/40 p-0.5 text-sm">
        <button
          type="button"
          disabled={disabled}
          onClick={() => onChange([])}
          className={cn(
            'rounded px-3 py-1 font-medium transition-colors',
            allVenues
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          All venues
        </button>
        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            // Seed with the first venue so "Specific" is a valid non-empty state.
            if (allVenues && list[0]) onChange([list[0].id])
          }}
          className={cn(
            'rounded px-3 py-1 font-medium transition-colors',
            !allVenues
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          Specific venues
        </button>
      </div>

      {!allVenues && (
        <ul className="space-y-1">
          {list.map((venue) => {
            const checked = value.includes(venue.id)
            return (
              <li key={venue.id}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => toggle(venue.id)}
                  aria-pressed={checked}
                  className={cn(
                    'flex w-full items-center gap-2.5 rounded-md border px-3 py-2 text-left text-sm transition-colors',
                    checked
                      ? 'border-foreground/30 bg-muted/60'
                      : 'border-border hover:bg-muted/40',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-4 w-4 shrink-0 items-center justify-center rounded border',
                      checked ? 'border-foreground bg-foreground text-background' : 'border-border',
                    )}
                    aria-hidden
                  >
                    {checked && <Check className="h-3 w-3" />}
                  </span>
                  <span className="min-w-0 truncate">{venue.name}</span>
                </button>
              </li>
            )
          })}
        </ul>
      )}
      <p className="text-xs text-muted-foreground">
        {allVenues
          ? 'Can see every venue in your organisation.'
          : 'Can only see the selected venues.'}
      </p>
    </div>
  )
}

// One-venue orgs have nothing to scope — the whole control is pointless there.
export function useShouldShowVenueAccess(): boolean {
  const { data: venues } = useVenues()
  return (venues?.length ?? 0) > 1
}
