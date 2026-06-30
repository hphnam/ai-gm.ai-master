'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
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
import { apiPost } from '@/lib/api-client'
import { mapApiError } from '@/lib/map-api-error'

// 03-06 — minimal onboarding completion form. Asks for the invitee's name and
// kicks off the redeem flow against the API. Auth integration with better-auth
// (sign-up if no User row) is the remaining piece — for now the redeem endpoint
// creates a synthetic User row keyed by phone, matching the existing
// linkUserAndWelcome flow in whatsapp-onboarding.service.ts.

type Preview = {
  inviteId: string
  orgName: string
  role: string
}

const schema = z.object({
  name: z.string().trim().min(1, 'Enter your name').max(120, 'Name is too long'),
})
type FormValues = z.infer<typeof schema>

export function OnboardBody({ token, preview }: { token: string; preview: Preview }) {
  const router = useRouter()
  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  })

  const redeem = useMutation({
    mutationFn: (name: string) =>
      apiPost<void>('/whatsapp/invites/redeem/complete', { token, name }),
    onSuccess: () => {
      router.push('/chat')
    },
  })

  async function onSubmit(values: FormValues) {
    await redeem.mutateAsync(values.name).catch(() => undefined)
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold">Join {preview.orgName}</h1>
      <p className="mt-2 text-muted-foreground">
        You've been invited as a {preview.role}. Confirm your name to get started.
      </p>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="mt-6 space-y-4" noValidate>
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Your name</FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    autoComplete="name"
                    placeholder="Alex Smith"
                    disabled={redeem.isPending}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {redeem.isError ? (
            <p className="text-sm text-destructive" role="alert">
              {mapApiError(redeem.error)}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={redeem.isPending}>
            {redeem.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                Joining…
              </>
            ) : (
              `Join ${preview.orgName}`
            )}
          </Button>
        </form>
      </Form>
    </div>
  )
}
