'use client'

import { Bell, Loader2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

  const [title, setTitle] = useState('')
  const [summary, setSummary] = useState('')
  const [frequency, setFrequency] = useState<ScheduleFrequency>('weekly')
  const [hourOfDay, setHourOfDay] = useState(9)
  const [dayOfWeek, setDayOfWeek] = useState(1)
  const [dayOfMonth, setDayOfMonth] = useState(1)
  const [timezone, setTimezone] = useState(() =>
    TIMEZONES.includes(browserTz) ? browserTz : 'UTC',
  )
  const [venueId, setVenueId] = useState<string>('all')
  const [prompt, setPrompt] = useState('')

  const reset = () => {
    setTitle('')
    setSummary('')
    setFrequency('weekly')
    setHourOfDay(9)
    setDayOfWeek(1)
    setDayOfMonth(1)
    setVenueId('all')
    setPrompt('')
  }

  const handleOpenChange = (next: boolean) => {
    if (!next) reset()
    onOpenChange(next)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    const body: CreateScheduledReportBody = {
      title: title.trim(),
      summary: summary.trim() || undefined,
      frequency,
      hourOfDay,
      timezone,
      venueId: venueId === 'all' ? null : venueId,
      prompt: prompt.trim() || undefined,
    }
    if (frequency === 'weekly') body.dayOfWeek = dayOfWeek
    if (frequency === 'monthly') body.dayOfMonth = dayOfMonth
    try {
      await create.mutateAsync(body)
      reset()
      onOpenChange(false)
    } catch {
      // Surface via the inline error below — keep dialog open so user can edit.
    }
  }

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

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field id="title" label="Title" required>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Weekly sales recap"
              maxLength={200}
              required
              autoFocus
            />
          </Field>

          <Field id="summary" label="Summary" hint="Optional — one line shown under the title.">
            <Input
              id="summary"
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="Sales, top items, labour — every Monday morning."
              maxLength={500}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field id="frequency" label="Frequency">
              <Select value={frequency} onValueChange={(v) => setFrequency(v as ScheduleFrequency)}>
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

            <Field id="hour" label="Hour of day">
              <Select value={String(hourOfDay)} onValueChange={(v) => setHourOfDay(Number(v))}>
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
          </div>

          {frequency === 'weekly' ? (
            <Field id="weekday" label="Day of week">
              <Select value={String(dayOfWeek)} onValueChange={(v) => setDayOfWeek(Number(v))}>
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
          ) : null}

          {frequency === 'monthly' ? (
            <Field id="dom" label="Day of month" hint="1–28, so February always works.">
              <Select value={String(dayOfMonth)} onValueChange={(v) => setDayOfMonth(Number(v))}>
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
          ) : null}

          <Field id="tz" label="Timezone">
            <Select value={timezone} onValueChange={setTimezone}>
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

          <Field id="venue" label="Scope">
            <Select value={venueId} onValueChange={setVenueId}>
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

          <Field
            id="prompt"
            label="What should each run cover?"
            hint="Plain English. The agent uses this to compose the report content."
          >
            <Textarea
              id="prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Focus on sales, top items, and labour for the last 7 days."
              rows={3}
              maxLength={1000}
            />
          </Field>

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
