'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
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
import { useCreateInvitation } from '@/lib/hooks/use-invitations'
import { useCreateWhatsappInvite } from '@/lib/hooks/use-whatsapp-invites'
import { mapApiError } from '@/lib/map-api-error'
import { toE164 } from '@/lib/phone'
import { cn } from '@/lib/utils'

const schema = z
  .object({
    channel: z.enum(['email', 'phone']),
    email: z.string(),
    phoneNumber: z.string(),
    role: z.enum(['manager', 'staff']),
  })
  .superRefine((v, ctx) => {
    if (v.channel === 'email' && !z.string().email().safeParse(v.email).success) {
      ctx.addIssue({ path: ['email'], code: 'custom', message: 'Enter a valid email' })
    }
    if (v.channel === 'phone' && !toE164(v.phoneNumber)) {
      ctx.addIssue({
        path: ['phoneNumber'],
        code: 'custom',
        message: 'Enter a valid mobile number, e.g. 07700 900000',
      })
    }
  })
type FormValues = z.infer<typeof schema>

export function InviteForm() {
  const createEmail = useCreateInvitation()
  const createPhone = useCreateWhatsappInvite()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { channel: 'email', email: '', phoneNumber: '', role: 'staff' },
  })

  const channel = form.watch('channel')
  const pending = createEmail.isPending || createPhone.isPending

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      if (values.channel === 'email') {
        await createEmail.mutateAsync({ email: values.email, role: values.role })
      } else {
        // Guaranteed non-null: the resolver rejects any value toE164 can't parse.
        const phoneNumber = toE164(values.phoneNumber) as string
        await createPhone.mutateAsync({ input: { phoneNumber, role: values.role } })
        toast.success(`Invite texted to ${phoneNumber}`)
      }
      form.reset({ channel: values.channel, email: '', phoneNumber: '', role: 'staff' })
    } catch (err) {
      if (values.channel === 'phone') toast.error(mapApiError(err))
    }
  })

  return (
    <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-5">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Invite a teammate
      </h2>

      <div className="mb-4 inline-flex rounded-md border bg-muted/40 p-0.5 text-sm">
        {(['email', 'phone'] as const).map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => form.setValue('channel', c)}
            className={cn(
              'rounded px-3 py-1 font-medium transition-colors',
              channel === c
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {c === 'email' ? 'Email' : 'Phone'}
          </button>
        ))}
      </div>

      <Form {...form}>
        <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-start">
          {channel === 'email' ? (
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      autoComplete="email"
                      placeholder="teammate@example.com"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          ) : (
            <FormField
              control={form.control}
              name="phoneNumber"
              render={({ field }) => (
                <FormItem className="flex-1">
                  <FormLabel>Mobile number</FormLabel>
                  <FormControl>
                    <Input
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      placeholder="07700 900000"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}
          <FormField
            control={form.control}
            name="role"
            render={({ field }) => (
              <FormItem className="sm:w-40">
                <FormLabel>Role</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
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
          <div className="sm:pt-7">
            <Button type="submit" disabled={pending}>
              {pending ? 'Sending…' : channel === 'email' ? 'Send invite' : 'Text invite'}
            </Button>
          </div>
        </form>
      </Form>
      <p className="mt-3 text-xs text-muted-foreground">
        {channel === 'email'
          ? 'They get an email link to create an account and join.'
          : 'They get an SMS link to verify their number and join — no password needed.'}
      </p>
    </section>
  )
}
