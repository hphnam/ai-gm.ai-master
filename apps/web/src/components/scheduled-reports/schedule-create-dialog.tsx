'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Bell, Loader2 } from 'lucide-react'
import { useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Form, FormField } from '@/components/ui/form'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { ApiError } from '@/lib/api-client'
import {
  type CreateScheduledReportBody,
  type ScheduleFrequency,
  useCreateScheduledReport,
} from '@/lib/hooks/use-scheduled-reports'
import { useVenues } from '@/lib/hooks/use-venues'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const WEEKDAYS = [
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
  { value: 7, label: 'Sunday' },
]
// Short curated list — IANA has thousands; surface the ones the team actually
// operates in plus a UTC fallback. Free-text fallback is the venue's tz which
// gets stamped server-side anyway.
const TIMEZONES = [
  'UTC',
  'Europe/London',
  'Europe/Dublin',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Madrid',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
]

const FormSchema = z.object({
  title: z.string().trim().min(1),
  summary: z.string(),
  frequency: z.enum(['daily', 'weekly', 'monthly']),
  hourOfDay: z.number(),
  dayOfWeek: z.number(),
  dayOfMonth: z.number(),
  timezone: z.string(),
  venueId: z.string(),
  prompt: z.string(),
})

type FormValues = z.infer<typeof FormSchema>

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ScheduleCreateDialog({ open, onOpenChange }: Props) {
  const venues = useVenues()
  const create = useCreateScheduledReport()
  const browserTz = useMemo(() => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
    } catch {
      return 'UTC'
    }
  }, [])

  const form = useForm<FormValues>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      title: '',
      summary: '',
      frequency: 'weekly',
      hourOfDay: 9,
      dayOfWeek: 1,
      dayOfMonth: 1,
      timezone: TIMEZONES.includes(browserTz) ? browserTz : 'UTC',
      venueId: 'all',
      prompt: '',
    },
  })

  const frequency = form.watch('frequency')
  const title = form.watch('title')

  // Timezone is intentionally preserved across resets — once a user picks one,
  // it sticks for the next schedule they create in the same session.
  const reset = () => {
    form.reset({
      title: '',
      summary: '',
      frequency: 'weekly',
      hourOfDay: 9,
      dayOfWeek: 1,
      dayOfMonth: 1,
      timezone: form.getValues('timezone'),
      venueId: 'all',
      prompt: '',
    })
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleSubmit = form.handleSubmit(async (values) => {
    const body: CreateScheduledReportBody = {
      title: values.title.trim(),
      summary: values.summary.trim() || undefined,
      frequency: values.frequency,
      hourOfDay: values.hourOfDay,
      timezone: values.timezone,
      venueId: values.venueId === 'all' ? null : values.venueId,
      prompt: values.prompt.trim() || undefined,
    }
    if (values.frequency === 'weekly') body.dayOfWeek = values.dayOfWeek
    if (values.frequency === 'monthly') body.dayOfMonth = values.dayOfMonth
    try {
      await create.mutateAsync(body)
      reset()
      onOpenChange(false)
    } catch {
      // Surface via the inline error below — keep dialog open so user can edit.
    }
  })

  const errorCopy =
    create.error instanceof ApiError
      ? create.error.status === 409
        ? 'Your org has hit the 50 live-schedule limit. Cancel one first.'
        : create.error.status === 429
          ? 'Too many schedule creations — try again shortly.'
          : create.error.status === 400
            ? 'Check the fields and try again.'
            : "Couldn't save the schedule."
      : create.isError
        ? "Couldn't save the schedule."
        : null

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display text-lg">New scheduled report</DialogTitle>
          <DialogDescription className="flex items-start gap-1.5">
            <Bell className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground/60" aria-hidden />
            <span>
              Each run sends a notification to your bell with a link to the report — open it from
              anywhere.
            </span>
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <Field id="title" label="Title" required>
                  <Input
                    id="title"
                    {...field}
                    placeholder="Weekly sales recap"
                    maxLength={200}
                    required
                    autoFocus
                  />
                </Field>
              )}
            />

            <FormField
              control={form.control}
              name="summary"
              render={({ field }) => (
                <Field
                  id="summary"
                  label="Summary"
                  hint="Optional — one line shown under the title."
                >
                  <Input
                    id="summary"
                    {...field}
                    placeholder="Sales, top items, labour — every Monday morning."
                    maxLength={500}
                  />
                </Field>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <Field id="frequency" label="Frequency">
                    <Select
                      value={field.value}
                      onValueChange={(v) => field.onChange(v as ScheduleFrequency)}
                    >
                      <SelectTrigger id="frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily</SelectItem>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />

              <FormField
                control={form.control}
                name="hourOfDay"
                render={({ field }) => (
                  <Field id="hour" label="Hour of day">
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <SelectTrigger id="hour">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HOURS.map((h) => (
                          <SelectItem key={h} value={String(h)}>
                            {String(h).padStart(2, '0')}:00
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            </div>

            {frequency === 'weekly' ? (
              <FormField
                control={form.control}
                name="dayOfWeek"
                render={({ field }) => (
                  <Field id="weekday" label="Day of week">
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <SelectTrigger id="weekday">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {WEEKDAYS.map((d) => (
                          <SelectItem key={d.value} value={String(d.value)}>
                            {d.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            ) : null}

            {frequency === 'monthly' ? (
              <FormField
                control={form.control}
                name="dayOfMonth"
                render={({ field }) => (
                  <Field id="dom" label="Day of month" hint="1–28, so February always works.">
                    <Select
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <SelectTrigger id="dom">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {Array.from({ length: 28 }, (_, i) => i + 1).map((d) => (
                          <SelectItem key={d} value={String(d)}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </Field>
                )}
              />
            ) : null}

            <FormField
              control={form.control}
              name="timezone"
              render={({ field }) => (
                <Field id="tz" label="Timezone">
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="tz">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEZONES.map((tz) => (
                        <SelectItem key={tz} value={tz}>
                          {tz}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            <FormField
              control={form.control}
              name="venueId"
              render={({ field }) => (
                <Field id="venue" label="Scope">
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger id="venue">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All venues</SelectItem>
                      {(venues.data ?? []).map((v) => (
                        <SelectItem key={v.id} value={v.id}>
                          {v.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
            />

            <FormField
              control={form.control}
              name="prompt"
              render={({ field }) => (
                <Field
                  id="prompt"
                  label="What should each run cover?"
                  hint="Plain English. The agent uses this to compose the report content."
                >
                  <Textarea
                    id="prompt"
                    {...field}
                    placeholder="Focus on sales, top items, and labour for the last 7 days."
                    rows={3}
                    maxLength={1000}
                  />
                </Field>
              )}
            />

            {errorCopy ? (
              <p
                role="alert"
                className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs text-destructive"
              >
                {errorCopy}
              </p>
            ) : null}

            <DialogFooter className="gap-2 sm:gap-0">
              <button
                type="button"
                onClick={() => handleOpenChange(false)}
                className="cursor-pointer rounded-md border border-border bg-background px-3 py-1.5 text-sm transition-colors hover:bg-accent"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={create.isPending || !title.trim()}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded-md bg-brand px-3 py-1.5 text-sm font-medium text-brand-foreground transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {create.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : null}
                Create schedule
              </button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}

function Field({
  id,
  label,
  hint,
  required,
  children,
}: {
  id: string
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-foreground">
        {label}
        {required ? <span className="ml-0.5 text-destructive">*</span> : null}
      </Label>
      {children}
      {hint ? <p className="text-[11px] text-muted-foreground">{hint}</p> : null}
    </div>
  )
}
