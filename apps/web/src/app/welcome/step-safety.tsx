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
import { Textarea } from '@/components/ui/textarea'
import { useUpdateVenueProfile, useVenue } from '@/lib/hooks/use-venues'
import { mapApiError } from '@/lib/map-api-error'
import { StepFooter, StepShell } from './step-shell'
import type { OnboardingStepId } from './steps'

type FormValues = {
  fireEscapesText: string
  firstAidPointsText: string
  alarmPolicy: string
  keySafePolicy: string
  accessibilityNotes: string
}

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

function joinLines(arr?: string[] | null): string {
  return (arr ?? []).join('\n')
}

export function StepSafety({
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
      fireEscapesText: '',
      firstAidPointsText: '',
      alarmPolicy: '',
      keySafePolicy: '',
      accessibilityNotes: '',
    },
    values: profile
      ? {
          fireEscapesText: joinLines(profile.fireEscapes),
          firstAidPointsText: joinLines(profile.firstAidPoints),
          alarmPolicy: profile.alarmPolicy ?? '',
          keySafePolicy: profile.keySafePolicy ?? '',
          accessibilityNotes: profile.accessibilityNotes ?? '',
        }
      : undefined,
  })

  const submitting = update.isPending

  async function save(values: FormValues): Promise<boolean> {
    try {
      const fires = splitLines(values.fireEscapesText)
      const aid = splitLines(values.firstAidPointsText)
      await update.mutateAsync({
        id: venueId,
        patch: {
          fireEscapes: fires.length > 0 ? fires : undefined,
          firstAidPoints: aid.length > 0 ? aid : undefined,
          alarmPolicy: values.alarmPolicy.trim() || undefined,
          keySafePolicy: values.keySafePolicy.trim() || undefined,
          accessibilityNotes: values.accessibilityNotes.trim() || undefined,
        },
      })
      return true
    } catch (err) {
      toast.error(mapApiError(err))
      return false
    }
  }

  const onSubmit = form.handleSubmit(async (values) => {
    if (await save(values)) onAdvance('knowledge')
  })

  const onSkip = () => onAdvance('knowledge')

  return (
    <StepShell
      eyebrow="Safety"
      title="The things that matter when something goes wrong."
      intro="When a duty manager asks &ldquo;where&rsquo;s the fire escape?&rdquo; or &ldquo;what&rsquo;s the alarm code policy?&rdquo; — your AI will answer instantly instead of fudging."
    >
      <Form {...form}>
        <form onSubmit={onSubmit} className="space-y-6" noValidate>
          <FormField
            control={form.control}
            name="fireEscapesText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Fire escape locations</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={3}
                    placeholder={
                      'Rear of bar past cellar door\nFire door beside the gents\nKitchen back door'
                    }
                    disabled={submitting}
                    autoFocus
                  />
                </FormControl>
                <FormDescription>One per line.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="firstAidPointsText"
            render={({ field }) => (
              <FormItem>
                <FormLabel>First-aid points</FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={2}
                    placeholder={'Behind the bar (under the till)\nBack office shelf, top right'}
                    disabled={submitting}
                  />
                </FormControl>
                <FormDescription>One per line.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="alarmPolicy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Alarm policy{' '}
                  <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={2}
                    placeholder="Panel by back door. Code held by duty manager. False alarm? Call ADT on 0800…"
                    disabled={submitting}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="keySafePolicy"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Key safe policy{' '}
                  <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={2}
                    placeholder="Owner + duty managers only. Codes rotate quarterly."
                    disabled={submitting}
                  />
                </FormControl>
                <FormDescription>
                  Who has access — don&rsquo;t put the actual code here.
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="accessibilityNotes"
            render={({ field }) => (
              <FormItem>
                <FormLabel>
                  Accessibility{' '}
                  <span className="text-xs font-normal text-muted-foreground">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    rows={2}
                    placeholder="Step-free entry via side gate; accessible WC by garden door; hearing loop at the bar."
                    disabled={submitting}
                  />
                </FormControl>
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
