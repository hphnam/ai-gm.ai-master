'use client'

import { Bell, Loader2, MapPin, ShieldAlert } from 'lucide-react'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { VenueDetailDto as VenueDetail } from '@/generated/api'
import { VenuesControllerUpdateProfileBody as VenueProfileSchema } from '@/generated/zod'
import type { VenueProfileDto as VenueProfile } from '@/lib/api-types'
import { useRunNudge, useUpdateVenueProfile } from '@/lib/hooks/use-venues'
import { mapApiError } from '@/lib/map-api-error'

type FormValues = {
  layoutNotes: string
  fireEscapesText: string
  firstAidPointsText: string
  keySafePolicy: string
  alarmPolicy: string
  openingHours: string
  what3words: string
  accessibilityNotes: string
  deliveryNotes: string
}

function joinLines(arr?: string[] | null): string {
  return (arr ?? []).join('\n')
}

function splitLines(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
}

function profileToForm(profile: VenueProfile): FormValues {
  return {
    layoutNotes: profile.layoutNotes ?? '',
    fireEscapesText: joinLines(profile.fireEscapes),
    firstAidPointsText: joinLines(profile.firstAidPoints),
    keySafePolicy: profile.keySafePolicy ?? '',
    alarmPolicy: profile.alarmPolicy ?? '',
    openingHours: profile.openingHours ?? '',
    what3words: profile.what3words ?? '',
    accessibilityNotes: profile.accessibilityNotes ?? '',
    deliveryNotes: profile.deliveryNotes ?? '',
  }
}

function formToProfile(values: FormValues): VenueProfile {
  return VenueProfileSchema.parse({
    layoutNotes: values.layoutNotes.trim() || undefined,
    fireEscapes:
      splitLines(values.fireEscapesText).length > 0
        ? splitLines(values.fireEscapesText)
        : undefined,
    firstAidPoints:
      splitLines(values.firstAidPointsText).length > 0
        ? splitLines(values.firstAidPointsText)
        : undefined,
    keySafePolicy: values.keySafePolicy.trim() || undefined,
    alarmPolicy: values.alarmPolicy.trim() || undefined,
    openingHours: values.openingHours.trim() || undefined,
    what3words: values.what3words.trim() || undefined,
    accessibilityNotes: values.accessibilityNotes.trim() || undefined,
    deliveryNotes: values.deliveryNotes.trim() || undefined,
  })
}

export function VenueProfileEditor({ venue }: { venue: VenueDetail }) {
  const update = useUpdateVenueProfile()
  const runNudge = useRunNudge()

  // No client-side resolver — VenueProfileSchema runs at submit time inside
  // formToProfile() and on the server. The form fields are stringy mirrors of
  // the schema (fireEscapesText / firstAidPointsText are textareas split into
  // arrays at submit), so a direct Zod resolver wouldn't apply cleanly.
  const form = useForm<FormValues>({
    defaultValues: profileToForm(venue.profile),
    mode: 'onChange',
  })

  // Reset when venue changes (selector switch).
  useEffect(() => {
    form.reset(profileToForm(venue.profile))
  }, [venue.id, venue.profile, form])

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const patch = formToProfile(values)
      await update.mutateAsync({ id: venue.id, patch })
      toast.success('Profile saved — indexed and ready for chat.')
      form.reset(values)
    } catch (err) {
      toast.error(mapApiError(err))
    }
  })

  const onSendTestNudge = async () => {
    try {
      const result = await runNudge.mutateAsync(venue.id)
      if (result.sent) {
        toast.success('Nudge sent — check the duty manager phone.')
      } else {
        toast.message(`No nudge sent: ${result.reason ?? 'nothing actionable'}`)
      }
    } catch (err) {
      toast.error(mapApiError(err))
    }
  }

  const dirty = form.formState.isDirty
  const isSaving = update.isPending

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <Section title="Operations" icon={<MapPin className="h-3.5 w-3.5" />}>
        <Field
          label="Opening hours"
          hint="Plain English. Example: Mon–Thu 12:00–23:00, Fri/Sat 12:00–01:00, Sun 12:00–22:00"
        >
          <Input {...form.register('openingHours')} placeholder="Mon–Sun 12:00–23:00" />
        </Field>
        <Field
          label="Layout notes"
          hint="A few sentences describing the layout — bar, kitchen, cellar, garden, etc."
        >
          <Textarea
            {...form.register('layoutNotes')}
            rows={3}
            placeholder="Front bar with 8 hand pumps; back bar serves spirits and cocktails; cellar accessed via cellar trap behind the till; ..."
          />
        </Field>
        <Field label="What3Words" hint="Useful for delivery drivers and emergency services.">
          <Input {...form.register('what3words')} placeholder="///filled.count.soap" />
        </Field>
        <Field
          label="Delivery notes"
          hint="When suppliers should knock, where to leave parcels, etc."
        >
          <Textarea
            {...form.register('deliveryNotes')}
            rows={2}
            placeholder="Use rear yard gate; ring bell twice; leave non-perishables in covered porch."
          />
        </Field>
      </Section>

      <Section title="Safety" icon={<ShieldAlert className="h-3.5 w-3.5" />}>
        <Field label="Fire escape locations" hint="One per line.">
          <Textarea
            {...form.register('fireEscapesText')}
            rows={3}
            placeholder={
              'Rear of bar past cellar door\nFire door beside the gents\nKitchen back door'
            }
          />
        </Field>
        <Field label="First-aid points" hint="One per line.">
          <Textarea
            {...form.register('firstAidPointsText')}
            rows={2}
            placeholder={'Behind the bar (under the till)\nBack office shelf, top right'}
          />
        </Field>
        <Field
          label="Alarm policy"
          hint="What staff should do on activation, where the panel is, who to call."
        >
          <Textarea
            {...form.register('alarmPolicy')}
            rows={2}
            placeholder="Panel by back door. Code held by duty manager. False alarm? Call ADT on 0800 ..."
          />
        </Field>
        <Field
          label="Key safe policy"
          hint="Who has access, what's the rotation? (Don't put the code itself in here.)"
        >
          <Textarea
            {...form.register('keySafePolicy')}
            rows={2}
            placeholder="Owner + duty managers only. Codes rotate quarterly. Cleaner has temporary code, expires last day of each month."
          />
        </Field>
        <Field
          label="Accessibility notes"
          hint="Step-free routes, accessible WC, hearing loops, etc."
        >
          <Textarea
            {...form.register('accessibilityNotes')}
            rows={2}
            placeholder="Step-free entry via side gate; accessible WC by garden door; hearing loop at the bar."
          />
        </Field>
      </Section>

      <div className="sticky bottom-0 flex flex-wrap items-center justify-between gap-3 border-t border-border bg-background/90 py-3 backdrop-blur-sm">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Bell className="h-3.5 w-3.5" />
          <button
            type="button"
            onClick={onSendTestNudge}
            disabled={runNudge.isPending}
            className="underline-offset-2 hover:underline disabled:opacity-50"
          >
            {runNudge.isPending ? 'Sending nudge…' : 'Send a test nudge to the duty manager'}
          </button>
        </div>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!dirty || isSaving}
            onClick={() => form.reset(profileToForm(venue.profile))}
          >
            Discard
          </Button>
          <Button type="submit" size="sm" disabled={!dirty || isSaving}>
            {isSaving ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                Saving
              </>
            ) : (
              'Save profile'
            )}
          </Button>
        </div>
      </div>
    </form>
  )
}

function Section({
  title,
  icon,
  children,
}: {
  title: string
  icon?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <section className="rounded-lg border bg-card p-4 sm:p-5 shadow-sm">
      <header className="mb-4 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {icon}
        <span>{title}</span>
      </header>
      <div className="space-y-4">{children}</div>
    </section>
  )
}

function Field({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">{label}</Label>
      {children}
      {hint ? <p className="text-[11px] leading-snug text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
