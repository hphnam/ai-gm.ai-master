'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
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
import type { InviteBodyDto as InviteBody } from '@/generated/api'
import { InvitationsControllerCreateBody as InviteBodySchema } from '@/generated/zod'
import { useCreateInvitation } from '@/lib/hooks/use-invitations'

export function InviteForm() {
  const mutation = useCreateInvitation()
  const form = useForm<InviteBody>({
    resolver: zodResolver(InviteBodySchema),
    defaultValues: { email: '', role: 'staff' },
  })

  const onSubmit = form.handleSubmit(async (values) => {
    await mutation.mutateAsync(values).catch(() => {
      /* onError toast handles user feedback */
    })
    if (!mutation.isError) form.reset({ email: '', role: 'staff' })
  })

  return (
    <section className="rounded-lg border bg-card p-4 shadow-sm sm:p-5">
      <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Invite a teammate
      </h2>
      <Form {...form}>
        <form onSubmit={onSubmit} className="flex flex-col gap-3 sm:flex-row sm:items-start">
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
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending ? 'Sending…' : 'Send invite'}
            </Button>
          </div>
        </form>
      </Form>
    </section>
  )
}
