'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { safeRedirectOr } from '@/lib/safe-redirect'

const schema = z.object({
  email: EmailSchema,
  password: z.string().min(1, 'Enter your password'),
})
type FormValues = z.infer<typeof schema>

export function SignInForm() {
  const router = useRouter()
  const search = useSearchParams()
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      const { error } = await authClient.signIn.email({
        email: values.email,
        password: values.password,
      })
      if (error) {
        // audit-added S15: any failure (unknown email OR wrong password) surfaces
        // the SAME generic message. Never leak which branch failed.
        toast.error('Email or password is incorrect.')
        return
      }
      const target = safeRedirectOr(search.get('redirect'), '/chat')
      router.replace(target)
      router.refresh()
    } catch {
      toast.error('Network error — please retry.')
    } finally {
      setSubmitting(false)
    }
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
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Password</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="password"
                  autoComplete="current-password"
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
              Signing in…
            </>
          ) : (
            'Sign in'
          )}
        </Button>
        <p className="text-sm text-muted-foreground text-center">
          Don&apos;t have an account?{' '}
          <Link
            href={`/auth/sign-up${search.get('redirect') ? `?redirect=${encodeURIComponent(search.get('redirect')!)}` : ''}`}
            className="underline underline-offset-4"
          >
            Create account
          </Link>
        </p>
      </form>
    </Form>
  )
}
