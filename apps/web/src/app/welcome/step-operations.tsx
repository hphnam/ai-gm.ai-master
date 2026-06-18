'use client'

import { Loader2 } from 'lucide-react'
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
import { Textarea } from '@/components/ui/textarea'
import { useUpdateVenueProfile, useVenue } from '@/lib/hooks/use-venues'
import { mapApiError } from '@/lib/map-api-error'
import { StepFooter, StepShell } from './step-shell'
import type { OnboardingStepId } from './steps'

type FormValues = {
  openingHours: string
  layoutNotes: string
  deliveryNotes: string
  what3words: string
}

export function StepOperations({
  venueId,
  onAdvance,
  onBack,
}: {
  venueId: string
  onAdvance: (next: OnboardingStepId) => void
  onBack: () => void
}) {
  const { data: venue } = useVenue(venueId)
  const update = useUpdateVenueProfile()
  const profile = venue?.profile

  const form = useForm<FormValues>({
    defaultValues: {
      openingHours: '',
      layoutNotes: '',
      deliveryNotes: '',
      what3words: '',
    },
    values: profile
      ? {
          openingHours: profile.openingHours ?? '',
          layoutNotes: profile.layoutNotes ?? '',
          deliveryNotes: profile.deliveryNotes ?? '',
          what3words: profile.what3words ?? '',
        }
      : undefined,
  })

  const submitting = update.isPending

  async function save(values: FormValues): Promise<boolean> {
    try {
      await update.mutateAsync({
        id: venueId,
        patch: {
          openingHours: values.openingHours.trim() || undefined,
          layoutNotes: values.layoutNotes.trim() || undefined,
          deliveryNotes: values.deliveryNotes.trim() || undefined,
          what3words: values.what3words.trim() || undefined,
        },
      })
      return true
    } catch (err) {
      toast.error(mapApiError(err))
      return false
    }
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (await save(values)) onAdvance('safety')
  })

  const onSkip = () => onAdvance('safety')

  return (
    <StepShell
      eyebrow="Operations"
      title="How does your venue actually run?"
      intro="These help your AI sound like it&rsquo;s actually been here — answering staff questions about hours, layout, and deliveries without guessing."
    >
      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-6" noValidate>
          <FormField
            control={form.control}
            name="openingHours"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Opening hours</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    placeholder="Mon–Thu 12:00–23:00, Fri/Sat 12:00–01:00, Sun 12:00–22:00"
                    disabled={submitting}
                    autoFocus
                  />
                </FormControl>
                <FormDescription>Plain English is fine.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="layoutNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Layout</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={3}
                    placeholder="Front bar with 8 hand pumps; back bar serves spirits; cellar via trap behind the till; garden out back."
                    disabled={submitting}
                  />
                </FormControl>
                <FormDescription>
                  A sentence or two — bar, kitchen, cellar, garden, anything notable.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="deliveryNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Deliveries{' '}
                  <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={2}
                    placeholder="Use rear yard gate; ring bell twice; leave non-perishables in covered porch."
                    disabled={submitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="what3words"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  what3words{' '}
                  <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input {...field} placeholder="///filled.count.soap" disabled={submitting} />
                </FormControl>
                <FormDescription>Handy for drivers and emergency services.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <StepFooter
            onBack={onBack}
            onSkip={onSkip}
            primary={
              <Button type="submit" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                    Saving&hellip;
                  </>
                ) : (
                  'Save & continue'
                )}
              </Button>
            }
          />
        </form>
      </Form>
    </StepShell>
  )
}
