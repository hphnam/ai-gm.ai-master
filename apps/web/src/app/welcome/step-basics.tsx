'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
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
import { useCreateVenue, useUpdateVenue, useUpdateVenueProfile } from '@/lib/hooks/use-venues'
import { mapApiError } from '@/lib/map-api-error'
import { StepFooter, StepShell } from './step-shell'
import type { OnboardingStepId } from './steps'

export type VenueBasics = {
  name: string
  type: string
  address: string | null
  timezone: string
}

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
  initialVenue,
  onAdvance,
}: {
  userName: string | null
  initialVenueId: string | null
  initialVenue: VenueBasics | null
  onAdvance: (next: OnboardingStepId, venueId?: string | null) => void
}) {
  const createVenue = useCreateVenue()
  const updateVenue = useUpdateVenue()
  const updateVenueProfile = useUpdateVenueProfile()
  const orgProfile = useOrgProfile()
  const updateOrgProfile = useUpdateOrgProfile({ silent: true })
  const detectedTz = useMemo(detectTimezone, [])

  const isEditMode = Boolean(initialVenueId && initialVenue)
  const baseValues = useMemo<CreateVenueBody>(
    () =>
      initialVenue
        ? {
            name: initialVenue.name,
            type: initialVenue.type,
            address: initialVenue.address ?? '',
            timezone: initialVenue.timezone,
          }
        : { name: '', type: '', address: '', timezone: detectedTz },
    [initialVenue, detectedTz],
  )

  const [tzOverride, setTzOverride] = useState(false)
  const [manual, setManual] = useState(false)
  const [searchUnavailable, setSearchUnavailable] = useState(false)
  const [selected, setSelected] = useState<PlaceCandidate | null>(null)

  const form = useForm<CreateVenueBody>({
    resolver: zodResolver(CreateVenueBodySchema),
    defaultValues: baseValues,
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
        timezone: candidate.timezone ?? (form.getValues('timezone') || detectedTz),
      })
    },
    [form, detectedTz],
  )

  // Only clears the selection so the lookup reappears — never resets the form,
  // so typed edits survive backing out of a wrong pick.
  const onSearchAgain = useCallback(() => setSelected(null), [])

  const onManual = useCallback(() => setManual(true), [])
  const onUnavailable = useCallback(() => setSearchUnavailable(true), [])

  const [finalizing, setFinalizing] = useState(false)
  const submitting = createVenue.isPending || updateVenue.isPending || finalizing

  async function fanOutCandidateDetails(candidate: PlaceCandidate, venueId: string) {
    const tasks: Promise<unknown>[] = []
    const profileData = orgProfile.data ?? (await orgProfile.refetch()).data
    if (profileData) {
      // Picking a candidate is explicit intent — overwrite these three; goals
      // and constraints stay untouched. Google's blurb only fills a description
      // the user hasn't written, so a hand-typed one is never clobbered.
      const current = profileData.profile
      tasks.push(
        updateOrgProfile.mutateAsync({
          ...current,
          businessType: candidate.businessType ?? current.businessType,
          country: candidate.country ?? current.country,
          currency: candidate.currency ?? current.currency,
          description: current.description || candidate.description || undefined,
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
    try {
      let venueId = initialVenueId
      if (isEditMode && initialVenueId) {
        await updateVenue.mutateAsync({ id: initialVenueId, patch: values })
      } else {
        const venue = await createVenue.mutateAsync(values)
        toast.success(`Created ${venue.name}`)
        venueId = venue.id
      }
      // Keeps the button disabled through navigation — a re-enabled submit
      // during a slow route change could create a duplicate venue.
      setFinalizing(true)
      if (selected && venueId) {
        await fanOutCandidateDetails(selected, venueId)
      }
      onAdvance('operations', venueId)
    } catch (err) {
      setFinalizing(false)
      toast.error(mapApiError(err))
    }
  }

  const firstName = (userName ?? '').split(/\s+/)[0]
  const greeting = isEditMode
    ? firstName
      ? `Welcome back, ${firstName}.`
      : 'Welcome back.'
    : firstName
      ? `Welcome, ${firstName}.`
      : 'Welcome.'

  // Edit mode is search-first: the lookup sits above the prefilled form so a
  // fresh search can re-populate everything. Create mode reveals the form only
  // after a pick or an explicit "enter manually".
  const showLookup = !selected && !searchUnavailable && (isEditMode || !manual)
  const showForm = isEditMode || manual || searchUnavailable || Boolean(selected)

  return (
    <StepShell
      eyebrow={isEditMode ? 'Guided setup' : 'Get started'}
      title={
        <>
          {greeting}
          <br />
          <span className="text-muted-foreground">
            {isEditMode ? 'Let’s check the basics.' : 'Let’s set up your venue.'}
          </span>
        </>
      }
      intro={
        isEditMode
          ? 'Search for your business to re-fill the details, or correct them below.'
          : showForm
            ? 'Two minutes now and your AI GM speaks fluently about your venue. You can edit anything later in settings.'
            : 'Search for your business and we’ll fill in the details — your AI GM speaks fluently about your venue from day one.'
      }
      footer={null}
    >
      <div className="space-y-6">
        {showLookup ? (
          <BusinessLookup
            onSelect={onSelectCandidate}
            onManual={isEditMode ? undefined : onManual}
            onUnavailable={onUnavailable}
            disabled={submitting}
          />
        ) : null}

        {showForm ? (
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6" noValidate>
              {selected ? (
                <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-sm">
                  Found <span className="font-medium">{selected.name}</span>
                  {selected.openingHours ? ' — opening hours will be filled in too' : ''}. Not
                  right? Edit below, or{' '}
                  <button
                    type="button"
                    onClick={onSearchAgain}
                    disabled={submitting}
                    className="relative cursor-pointer rounded-sm underline-offset-4 after:absolute after:-inset-x-1 after:-inset-y-3 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
                        disabled={submitting}
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
                        disabled={submitting}
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
                      Address <span className="font-normal text-muted-foreground">(optional)</span>
                    </FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        value={field.value ?? ''}
                        placeholder="14 High Street, London SW1A 1AA"
                        disabled={submitting}
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
                    {tzOverride ? (
                      <FormControl>
                        <Input
                          {...field}
                          placeholder="Europe/London"
                          disabled={submitting}
                          autoFocus
                        />
                      </FormControl>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {isEditMode || selected?.timezone ? 'Timezone' : 'Detected timezone'}:{' '}
                        <span className="font-medium text-foreground">{field.value}</span> &middot;{' '}
                        <button
                          type="button"
                          onClick={() => setTzOverride(true)}
                          disabled={submitting}
                          className="relative cursor-pointer rounded-sm underline-offset-4 after:absolute after:-inset-x-1 after:-inset-y-3 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        >
                          Change
                        </button>
                      </p>
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <StepFooter
                primary={
                  <Button type="submit" disabled={submitting} className="min-h-11">
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                        {isEditMode ? 'Saving…' : 'Creating…'}
                      </>
                    ) : isEditMode ? (
                      'Save & continue'
                    ) : (
                      'Create venue & continue'
                    )}
                  </Button>
                }
              />
            </form>
          </Form>
        ) : null}
      </div>
    </StepShell>
  )
}
