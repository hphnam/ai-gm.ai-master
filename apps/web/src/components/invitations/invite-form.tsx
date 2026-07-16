'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { ChevronDown, Mail, Phone, Plus, Trash2 } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { type Control, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SettingCard } from '@/components/ui/setting-card'
import { type BatchInviteRow, useBatchInvite } from '@/lib/hooks/use-invitations'
import { toE164 } from '@/lib/phone'
import { cn } from '@/lib/utils'
import { useShouldShowVenueAccess, VenueAccessPicker } from './venue-access-picker'

const rowSchema = z
  .object({
    channel: z.enum(['email', 'phone']),
    value: z.string(),
    role: z.enum(['manager', 'staff']),
    venueIds: z.array(z.string()),
  })
  .superRefine((v, ctx) => {
    if (!v.value.trim()) {
      ctx.addIssue({
        path: ['value'],
        code: 'custom',
        message: v.channel === 'email' ? 'Enter an email' : 'Enter a mobile number',
      })
      return
    }
    if (v.channel === 'email' && !z.string().email().safeParse(v.value).success) {
      ctx.addIssue({ path: ['value'], code: 'custom', message: 'Enter a valid email' })
    }
    if (v.channel === 'phone' && !toE164(v.value)) {
      ctx.addIssue({
        path: ['value'],
        code: 'custom',
        message: 'Enter a valid mobile number, e.g. 07700 900000',
      })
    }
  })

const schema = z.object({ rows: z.array(rowSchema).min(1) })
type FormValues = z.infer<typeof schema>
type RowValues = FormValues['rows'][number]

const emptyRow = (): RowValues => ({ channel: 'email', value: '', role: 'staff', venueIds: [] })

export function InviteForm() {
  const batch = useBatchInvite()
  const showVenueAccess = useShouldShowVenueAccess()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { rows: [emptyRow()] },
  })
  const { fields, append, remove } = useFieldArray({ control: form.control, name: 'rows' })

  // Newly added rows (initial, appended, or reset) open automatically; the user
  // can collapse a filled row afterwards. Tracked by react-hook-form's stable
  // field id so removals don't shift the open set.
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())
  const seen = useRef<Set<string>>(new Set())
  useEffect(() => {
    const added: string[] = []
    for (const f of fields) {
      if (!seen.current.has(f.id)) {
        seen.current.add(f.id)
        added.push(f.id)
      }
    }
    if (added.length) setOpenIds((prev) => new Set([...prev, ...added]))
  }, [fields])

  const toggle = (id: string) =>
    setOpenIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const onSubmit = form.handleSubmit(
    async (values) => {
      const rows: BatchInviteRow[] = values.rows.map((r) => ({
        channel: r.channel,
        value: r.channel === 'phone' ? (toE164(r.value) as string) : r.value.trim(),
        role: r.role,
        venueIds: r.venueIds,
      }))

      const results = await batch.mutateAsync(rows)
      const failed = results.filter((r) => !r.ok)
      const sent = results.filter((r) => r.ok && !r.warning && !r.reissued)
      const reissued = results.filter((r) => r.ok && !r.warning && r.reissued)
      const mailFailed = results.filter((r) => r.ok && r.warning === 'mail-send-failed')

      if (sent.length > 0) toast.success(`${sent.length} invite${sent.length > 1 ? 's' : ''} sent`)
      for (const r of reissued) {
        toast.info(`${values.rows[r.index].value} already had a pending invite — re-sent the link.`)
      }
      for (const r of mailFailed) {
        toast.warning(
          `Saved ${values.rows[r.index].value}'s invite but the email didn't send — copy its link from the list below.`,
        )
      }
      for (const f of failed) {
        toast.error(`${values.rows[f.index].value}: ${f.error}`)
      }

      if (failed.length === 0) {
        form.reset({ rows: [emptyRow()] })
        return
      }
      // Keep only the rows that failed so they can be fixed and retried.
      for (const idx of results
        .filter((r) => r.ok)
        .map((r) => r.index)
        .sort((a, b) => b - a)) {
        remove(idx)
      }
    },
    // A collapsed row can hold an invalid value — expand every row with an
    // error so the message is visible instead of the submit silently no-op'ing.
    (errors) => {
      const rowErrors = errors.rows
      if (!rowErrors) return
      const toOpen = fields.filter((_, i) => rowErrors[i]).map((f) => f.id)
      if (toOpen.length) setOpenIds((prev) => new Set([...prev, ...toOpen]))
    },
  )

  const count = fields.length

  return (
    <SettingCard title="Invite teammates">
      <Form {...form}>
        <form onSubmit={onSubmit} className="flex flex-col gap-3">
          <div className="flex flex-col gap-2.5">
            {fields.map((field, index) => (
              <InviteRow
                key={field.id}
                control={form.control}
                index={index}
                open={openIds.has(field.id)}
                onToggle={() => toggle(field.id)}
                onRemove={count > 1 ? () => remove(index) : undefined}
                onChannelChange={(channel) => form.setValue(`rows.${index}.channel`, channel)}
                onRoleChange={(role) => form.setValue(`rows.${index}.role`, role)}
                onVenueChange={(venueIds) => form.setValue(`rows.${index}.venueIds`, venueIds)}
                showVenueAccess={showVenueAccess}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={() => append(emptyRow())}
            >
              <Plus className="h-3.5 w-3.5" aria-hidden />
              Add another
            </Button>
            <Button
              type="submit"
              disabled={batch.isPending}
              className="shadow-[0_2px_0_var(--brass-shadow)]"
            >
              {batch.isPending ? 'Sending…' : count > 1 ? `Send ${count} invites` : 'Send invite'}
            </Button>
          </div>
        </form>
      </Form>
    </SettingCard>
  )
}

function InviteRow({
  control,
  index,
  open,
  onToggle,
  onRemove,
  onChannelChange,
  onRoleChange,
  onVenueChange,
  showVenueAccess,
}: {
  control: Control<FormValues>
  index: number
  open: boolean
  onToggle: () => void
  onRemove?: () => void
  onChannelChange: (channel: RowValues['channel']) => void
  onRoleChange: (role: RowValues['role']) => void
  onVenueChange: (venueIds: string[]) => void
  showVenueAccess: boolean
}) {
  const row = useWatch({ control, name: `rows.${index}` })
  const bodyId = useId()
  const ChannelIcon = row.channel === 'email' ? Mail : Phone

  return (
    <div className="overflow-hidden rounded-lg border bg-card">
      <div className="flex items-center gap-2 pr-2">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={bodyId}
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 px-3 py-2.5 text-left"
        >
          <ChannelIcon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
          <span className="min-w-0 flex-1 truncate text-sm">
            {row.value.trim() ? (
              <span className="text-foreground">{row.value.trim()}</span>
            ) : (
              <span className="text-muted-foreground">New invite</span>
            )}
          </span>
          {!open && row.value.trim() ? (
            <span className="hidden items-center gap-2 text-xs text-muted-foreground sm:flex">
              <span className="capitalize">{row.role}</span>
              {showVenueAccess ? (
                <>
                  <span aria-hidden>·</span>
                  <span>{venueSummary(row.venueIds)}</span>
                </>
              ) : null}
            </span>
          ) : null}
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 text-muted-foreground transition-transform motion-reduce:transition-none',
              open && 'rotate-180',
            )}
            aria-hidden
          />
        </button>
        {onRemove ? (
          <button
            type="button"
            onClick={onRemove}
            aria-label={`Remove invite ${index + 1}`}
            className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Trash2 className="h-4 w-4" aria-hidden />
          </button>
        ) : null}
      </div>

      {open ? (
        <div id={bodyId} className="flex flex-col gap-3 border-t px-3 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <div className="flex-1 space-y-1.5">
              <ChannelToggle value={row.channel} onChange={onChannelChange} />
              <FormField
                control={control}
                name={`rows.${index}.value`}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="sr-only">
                      {row.channel === 'email' ? 'Email' : 'Mobile number'}
                    </FormLabel>
                    <FormControl>
                      <Input
                        type={row.channel === 'email' ? 'email' : 'tel'}
                        inputMode={row.channel === 'email' ? 'email' : 'tel'}
                        autoComplete={row.channel === 'email' ? 'email' : 'tel'}
                        placeholder={
                          row.channel === 'email' ? 'teammate@example.com' : '07700 900000'
                        }
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={control}
              name={`rows.${index}.role`}
              render={({ field }) => (
                <FormItem className="sm:w-40">
                  <FormLabel className="sr-only">Role</FormLabel>
                  <Select
                    onValueChange={(v) => onRoleChange(v as RowValues['role'])}
                    value={field.value}
                  >
                    <FormControl className="mb-0">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          {showVenueAccess ? (
            <div className="border-t pt-3">
              <p className="mb-2 text-sm font-medium text-foreground">Venue access</p>
              <VenueAccessPicker value={row.venueIds} onChange={onVenueChange} />
            </div>
          ) : null}

          <p className="text-xs text-muted-foreground">
            {row.channel === 'email'
              ? 'They get an email link to create an account and join.'
              : 'They get an SMS link to verify their number and join — no password needed.'}
          </p>
        </div>
      ) : null}
    </div>
  )
}

function ChannelToggle({
  value,
  onChange,
}: {
  value: RowValues['channel']
  onChange: (channel: RowValues['channel']) => void
}) {
  return (
    <div className="inline-flex rounded-md border bg-muted/40 p-0.5 text-sm">
      {(['email', 'phone'] as const).map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => onChange(c)}
          className={cn(
            'cursor-pointer rounded px-3 py-1 font-medium transition-colors',
            value === c
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {c === 'email' ? 'Email' : 'Phone'}
        </button>
      ))}
    </div>
  )
}

function venueSummary(venueIds: string[]): string {
  if (venueIds.length === 0) return 'All venues'
  return `${venueIds.length} ${venueIds.length === 1 ? 'venue' : 'venues'}`
}
