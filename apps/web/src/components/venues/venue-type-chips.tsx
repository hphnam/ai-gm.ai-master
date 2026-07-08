'use client'

import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export const VENUE_TYPES = [
  'pub',
  'restaurant',
  'bar',
  'cafe',
  'hotel',
  'nightclub',
  'event space',
  'other',
] as const

export function VenueTypeChips({
  value,
  onChange,
  disabled,
}: {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {VENUE_TYPES.map((t) => {
        const active = value === t
        return (
          <button
            key={t}
            type="button"
            onClick={() => onChange(active ? '' : t)}
            disabled={disabled}
            aria-pressed={active}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm capitalize transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              disabled ? 'cursor-default' : 'cursor-pointer',
              active
                ? 'border-foreground bg-foreground text-background'
                : 'border-border bg-background text-foreground hover:bg-accent',
              disabled && !active && 'opacity-50',
            )}
          >
            {active ? <Check className="h-3 w-3" aria-hidden /> : null}
            {t}
          </button>
        )
      })}
    </div>
  )
}
