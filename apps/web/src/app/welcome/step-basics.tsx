'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useMemo, useState } from 'react'
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
import { BusinessLookup, type PlaceCandidate } from '@/components/venues/business-lookup'
import { VenueTypeChips } from '@/components/venues/venue-type-chips'
import type { CreateVenueBodyDto as CreateVenueBody } from '@/generated/api'
import { VenuesControllerCreateBody as CreateVenueBodySchema } from '@/generated/zod'
import { useOrgProfile, useUpdateOrgProfile } from '@/lib/hooks/use-org-profile'
import { useCreateVenue, useUpdateVenueProfile, useVenue } from '@/lib/hooks/use-venues'
import { mapApiError } from '@/lib/map-api-error'
import { StepFooter, StepShell } from './step-shell'
import type { OnboardingStepId } from './steps'

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
  const updateVenueProfile = useUpdateVenueProfile()
  const orgProfile = useOrgProfile()
  const updateOrgProfile = useUpdateOrgProfile({ silent: true })
  const { data: existingVenue } = useVenue(initialVenueId)
  const [tzOverride, setTzOverride] = useState(false)
  const [mode, setMode] = useState<'search' | 'manual'>('search')
  const [selected, setSelected] = useState<PlaceCandidate | null>(null)
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

  const onSelectCandidate = useCallback(
    (candidate: PlaceCandidate) => {
      setSelected(candidate)
      form.reset({
        name: candidate.name,
        type: candidate.venueType,
        address: candidate.address ?? '',
        timezone: candidate.timezone ?? detectedTz,
      })
    },
    [form, detectedTz],
  )

  const onSearchAgain = useCallback(() => {
    setSelected(null)
    form.reset({ name: '', type: '', address: '', timezone: detectedTz })
  }, [form, detectedTz])

  const onManual = useCallback(() => setMode('manual'), [])
  const onUnavailable = useCallback(() => setMode('manual'), [])

  const [finalizing, setFinalizing] = useState(false)
  const submitting = createVenue.isPending || finalizing

  async function fanOutCandidateDetails(candidate: PlaceCandidate, venueId: string) {
    const tasks: Promise<unknown>[] = []
    const profileData = orgProfile.data ?? (await orgProfile.refetch()).data
    if (profileData) {
      const current = profileData.profile
      tasks.push(
        updateOrgProfile.mutateAsync({
          ...current,
          businessType: current.businessType ?? candidate.businessType ?? undefined,
          country: current.country ?? candidate.country ?? undefined,
          currency: current.currency ?? candidate.currency ?? undefined,
        }),
      )
    }
    if (candidate.openingHours) {
      tasks.push(
        updateVenueProfile.mutateAsync({
          id: venueId,
          patch: { openingHours: candidate.openingHours },
        }),
      )
    }
    await Promise.allSettled(tasks)
  }

  async function onSubmit(values: CreateVenueBody) {
    if (initialVenueId) {
      onAdvance('operations', initialVenueId)
      return
    }
    try {
      const venue = await createVenue.mutateAsync(values)
      toast.success(`Created ${venue.name}`)
      if (selected) {
        setFinalizing(true)
        await fanOutCandidateDetails(selected, venue.id)
      }
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

  const showLookup = !isEditMode && mode === 'search' && !selected
  const showForm = isEditMode || mode === 'manual' || Boolean(selected)

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
        ) : mode === 'search' ? (
          'Search for your business and we’ll fill in the details — your AI GM speaks fluently about your venue from day one.'
        ) : (
          'Two minutes now and your AI GM speaks fluently about your venue. You can edit anything later in settings.'
        )
      }
      footer={null}
    >
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
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
            {selected && !isEditMode ? (
              <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm">
                Found <span className="font-medium">{selected.name}</span>
                {selected.openingHours ? ' — opening hours will be filled in too' : ''}. Not right?
                Edit below, or{' '}
                <button
                  type="button"
                  onClick={onSearchAgain}
                  disabled={submitting}
                  className="cursor-pointer underline underline-offset-4 hover:text-foreground"
                >
                  search again
                </button>
                .
              </div>
            ) : null}

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
                      autoFocus={!isEditMode && !selected}
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
                    <VenueTypeChips
                      value={field.value}
                      onChange={field.onChange}
                      disabled={readOnly}
                    />
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
                      <Input
                        {...field}
                        placeholder="Europe/London"
                        disabled={submitting}
                        autoFocus
                      />
                    </FormControl>
                  ) : (
                    <p className="text-xs text-muted-foreground">
                      {isEditMode
                        ? 'Timezone'
                        : selected?.timezone
                          ? 'Timezone'
                          : 'Detected timezone'}
                      : <span className="font-medium text-foreground">{field.value}</span>
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
      ) : null}
    </StepShell>
  )
}
