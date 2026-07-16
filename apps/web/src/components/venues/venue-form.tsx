'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useCallback, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import type { CreateVenueBodyDto as CreateVenueBody } from '@/generated/api'
import { VenuesControllerCreateBody as CreateVenueBodySchema } from '@/generated/zod'
import { useCreateVenue, useUpdateVenueProfile } from '@/lib/hooks/use-venues'
import { mapApiError } from '@/lib/map-api-error'
import { BusinessLookup, type PlaceCandidate } from './business-lookup'
import { VenueTypeChips } from './venue-type-chips'

export function VenueForm() {
  const router = useRouter()
  const createVenue = useCreateVenue()
  const updateVenueProfile = useUpdateVenueProfile()
  const [mode, setMode] = useState<'search' | 'manual'>('search')
  const [selected, setSelected] = useState<PlaceCandidate | null>(null)
  const [finalizing, setFinalizing] = useState(false)

  const form = useForm<CreateVenueBody>({
    resolver: zodResolver(CreateVenueBodySchema),
    defaultValues: { name: '', type: '', address: '', timezone: 'Europe/London' },
  })

  const onSelectCandidate = useCallback(
    (candidate: PlaceCandidate) => {
      setSelected(candidate)
      form.reset({
        name: candidate.name,
        type: candidate.venueType,
        address: candidate.address ?? '',
        timezone: candidate.timezone ?? 'Europe/London',
      })
    },
    [form],
  )

  const onSearchAgain = useCallback(() => {
    setSelected(null)
    form.reset({ name: '', type: '', address: '', timezone: 'Europe/London' })
  }, [form])

  const onManual = useCallback(() => setMode('manual'), [])
  const onUnavailable = useCallback(() => setMode('manual'), [])

  async function onSubmit(values: CreateVenueBody) {
    try {
      const venue = await createVenue.mutateAsync(values)
      toast.success(`Created ${venue.name}`)
      if (selected?.openingHours) {
        setFinalizing(true)
        await updateVenueProfile
          .mutateAsync({ id: venue.id, patch: { openingHours: selected.openingHours } })
          .catch(() => undefined)
      }
      router.push('/chat')
    } catch (err) {
      toast.error(mapApiError(err))
    }
  }

  const submitting = createVenue.isPending || finalizing
  const showLookup = mode === 'search' && !selected
  const showForm = mode === 'manual' || Boolean(selected)

  return (
    <div className="space-y-4">
      {showLookup ? (
        <BusinessLookup
          onSelect={onSelectCandidate}
          onManual={onManual}
          onUnavailable={onUnavailable}
          disabled={submitting}
        />
      ) : null}

      {showForm ? (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {selected ? (
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-success/10 px-2.5 py-1 text-[11px] font-medium text-success">
                  <Check className="h-3 w-3" aria-hidden />
                  Pulled from Google Business
                </span>
                <button
                  type="button"
                  onClick={onSearchAgain}
                  disabled={submitting}
                  className="cursor-pointer text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  Search again
                </button>
              </div>
            ) : null}

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Name</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="The Crown"
                      disabled={submitting}
                      autoFocus={!selected}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <VenueTypeChips
                      value={field.value}
                      onChange={field.onChange}
                      disabled={submitting}
                    />
                  </FormControl>
                  <FormDescription>Used as context for the AI.</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address (optional)</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      placeholder="14 High Street, London SW1A 1AA"
                      disabled={submitting}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Timezone</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Europe/London" disabled={submitting} />
                  </FormControl>
                  <FormDescription>
                    IANA timezone (e.g. Europe/London, America/New_York).
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={submitting}
                className="shadow-[0_2px_0_var(--brass-shadow)]"
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Creating…
                  </>
                ) : (
                  'Create venue'
                )}
              </Button>
            </div>
          </form>
        </Form>
      ) : null}
    </div>
  )
}
