'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Check, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import type { CreateVenueBodyDto as CreateVenueBody } from '@/generated/api'
import { VenuesControllerCreateBody as CreateVenueBodySchema } from '@/generated/zod'
import { useCreateVenue, useVenue } from '@/lib/hooks/use-venues'
import { mapApiError } from '@/lib/map-api-error'
import { cn } from '@/lib/utils'
import { StepFooter, StepShell } from './step-shell'
import type { OnboardingStepId } from './steps'

const VENUE_TYPES = [
  'pub',
  'restaurant',
  'bar',
  'cafe',
  'hotel',
  'nightclub',
  'event space',
  'other',
] as const

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/London'
  } catch {
    return 'Europe/London'
  }
}

export function StepBasics({
  userName,
  initialVenueId,
  onAdvance,
}: {
  userName: string | null
  initialVenueId: string | null
  onAdvance: (next: OnboardingStepId, venueId?: string | null) => void
}) {
  const createVenue = useCreateVenue()
  const { data: existingVenue } = useVenue(initialVenueId)
  const [tzOverride, setTzOverride] = useState(false)
  const detectedTz = useMemo(detectTimezone, [])

  const form = useForm<CreateVenueBody>({
    resolver: zodResolver(CreateVenueBodySchema),
    defaultValues: { name: '', type: '', address: '', timezone: detectedTz },
    // Re-seed when the user navigates back into step 1 after creation.
    // Basics is create-only — to edit fields here would mean a second mutation
    // path; we keep it focused and route edits to /settings/venues.
    values: existingVenue
      ? {
          name: existingVenue.name,
          type: existingVenue.type,
          address: existingVenue.address ?? '',
          timezone: existingVenue.timezone,
        }
      : undefined,
  })

  // Detected TZ runs in the browser, not at SSR — sync the field once mounted.
  useEffect(() => {
    if (!form.getValues('timezone')) form.setValue('timezone', detectedTz)
  }, [detectedTz, form])

  const submitting = createVenue.isPending

  async function onSubmit(values: CreateVenueBody) {
    if (initialVenueId) {
      onAdvance('operations', initialVenueId)
      return
    }
    try {
      const venue = await createVenue.mutateAsync(values)
      toast.success(`Created ${venue.name}`)
      onAdvance('operations', venue.id)
    } catch (err) {
      toast.error(mapApiError(err))
    }
  }

  const firstName = (userName ?? '').split(/\s+/)[0]
  const greeting = firstName ? `Welcome, ${firstName}.` : 'Welcome.'

  // Edit mode (revisiting step 1 after creation): show the values read-only so
  // it's obvious why "Continue" doesn't persist edits. Routes the manager to
  // /settings/venues if they actually want to change something. The first-time
  // create path uses the editable form below.
  const isEditMode = Boolean(initialVenueId)
  const readOnly = isEditMode || submitting

  return (
    <StepShell
      eyebrow="Get started"
      title={
        <>
          {greeting}
          <br />
          <span className="text-muted-foreground">
            {isEditMode ? 'Pick up where you left off.' : 'Let’s set up your venue.'}
          </span>
        </>
      }
      intro={
        isEditMode ? (
          <>
            Your venue is already saved. Continue with operations, or{' '}
            <Link href="/settings/venues" className="underline-offset-4 hover:underline">
              edit these details in settings
            </Link>
            .
          </>
        ) : (
          'Two minutes now and your AI GM speaks fluently about your venue. You can edit anything later in settings.'
        )
      }
      footer={null}
    >
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Venue name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="The Crown"
                    disabled={readOnly}
                    autoFocus={!isEditMode}
                    autoComplete="organization"
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
                <FormLabel>What kind of venue?</FormLabel>
                <FormControl>
                  <div className="flex flex-wrap gap-2">
                    {VENUE_TYPES.map((t) => {
                      const active = field.value === t
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => field.onChange(active ? '' : t)}
                          disabled={readOnly}
                          aria-pressed={active}
                          className={cn(
                            'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm capitalize transition-colors',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                            readOnly ? 'cursor-default' : 'cursor-pointer',
                            active
                              ? 'border-foreground bg-foreground text-background'
                              : 'border-border bg-background text-foreground hover:bg-accent',
                            readOnly && !active && 'opacity-50',
                          )}
                        >
                          {active ? <Check className="h-3 w-3" aria-hidden /> : null}
                          {t}
                        </button>
                      )
                    })}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Address{' '}
                  <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    value={field.value ?? ''}
                    placeholder="14 High Street, London SW1A 1AA"
                    disabled={readOnly}
                    autoComplete="street-address"
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
                <FormLabel className="sr-only">Timezone</FormLabel>
                {tzOverride && !isEditMode ? (
                  <FormControl>
                    <Input {...field} placeholder="Europe/London" disabled={submitting} autoFocus />
                  </FormControl>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    {isEditMode ? 'Timezone' : 'Detected timezone'}:{' '}
                    <span className="font-medium text-foreground">{field.value}</span>
                    {isEditMode ? null : (
                      <>
                        {' '}
                        &middot;{' '}
                        <button
                          type="button"
                          onClick={() => setTzOverride(true)}
                          className="cursor-pointer underline-offset-4 hover:underline"
                        >
                          Change
                        </button>
                      </>
                    )}
                  </p>
                )}
                <FormMessage />
              </FormItem>
            )}
          />

          <StepFooter
            primary={
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Creating&hellip;
                  </>
                ) : initialVenueId ? (
                  'Continue'
                ) : (
                  'Create venue & continue'
                )}
              </Button>
            }
          />
        </form>
      </Form>
    </StepShell>
  )
}
