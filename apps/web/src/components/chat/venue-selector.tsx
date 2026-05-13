'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useVenues } from '@/lib/hooks/use-venues'

type VenueSelectorProps = {
  targetRoute?: '/chat' | '/debug'
}

export function VenueSelector({ targetRoute = '/chat' }: VenueSelectorProps = {}) {
  const router = useRouter()
  const params = useSearchParams()
  const currentVenue = params.get('venue') ?? ''
  const { data: venues, isLoading, error } = useVenues()

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading venues…</div>
  }
  if (error) {
    return <div className="text-sm text-destructive">Failed to load venues.</div>
  }
  if (!venues || venues.length === 0) {
    return <div className="text-sm text-muted-foreground">No venues available.</div>
  }

  return (
    <Select value={currentVenue} onValueChange={(id) => router.push(`${targetRoute}?venue=${id}`)}>
      <SelectTrigger className="w-[280px]" aria-label="Select venue">
        <SelectValue placeholder="Choose a venue…" />
      </SelectTrigger>
      <SelectContent>
        {venues.map((v) => (
          <SelectItem key={v.id} value={v.id}>
            {v.name}
            {v.address ? (
              <span className="ml-2 text-xs text-muted-foreground">— {v.address}</span>
            ) : null}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
