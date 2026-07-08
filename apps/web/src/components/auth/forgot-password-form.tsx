'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'
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
import { authClient } from '@/lib/auth-client'
import { EmailSchema } from '@/lib/auth-schemas'

const schema = z.object({ email: EmailSchema })
type FormValues = z.infer<typeof schema>

export function ForgotPasswordForm() {
  const [submitting, setSubmitting] = useState(false)
  const [sent, setSent] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      await authClient.requestPasswordReset({
        email: values.email,
        redirectTo: '/auth/reset-password',
      })
      setSent(true)
    } catch {
      toast.error('Network error — please retry.')
    } finally {
      setSubmitting(false)
    }
  }

  if (sent) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm text-muted-foreground">
          If an account exists for that email, we&apos;ve sent a link to reset your password. Check
          your inbox.
        </p>
        <Link href="/auth/sign-in" className="text-sm underline underline-offset-4">
          Back to sign in
        </Link>
      </div>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  disabled={submitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              Sending…
            </>
          ) : (
            'Send reset link'
          )}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/auth/sign-in" className="underline underline-offset-4">
            Back to sign in
          </Link>
        </p>
      </form>
    </Form>
  )
}
