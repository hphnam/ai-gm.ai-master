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
import { EmailSchema, NameSchema, PasswordSchema } from '@/lib/auth-schemas'
import { safeRedirectOr } from '@/lib/safe-redirect'

const schema = z.object({
  name: NameSchema,
  email: EmailSchema,
  password: PasswordSchema,
})
type FormValues = z.infer<typeof schema>

export function SignUpForm() {
  const router = useRouter()
  const search = useSearchParams()
  const [submitting, setSubmitting] = useState(false)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', email: '', password: '' },
  })

  async function onSubmit(values: FormValues) {
    setSubmitting(true)
    try {
      const { error } = await authClient.signUp.email({
        email: values.email,
        password: values.password,
        name: values.name,
      })
      if (error) {
        if (error.code === 'USER_ALREADY_EXISTS' || error.status === 422) {
          toast.error('An account with that email already exists.')
        } else {
          toast.error(error.message ?? 'Sign-up failed — please retry.')
        }
        return
      }
      // Fresh accounts have zero venues — go straight into onboarding instead
      // of dumping them onto an empty /chat. requireAppAccess on /chat would
      // bounce them to /welcome anyway; routing directly avoids the extra hop.
      // If a redirect was explicitly requested (e.g. a magic-link invite),
      // honour it.
      const target = safeRedirectOr(search.get('redirect'), '/welcome')
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
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  autoComplete="name"
                  placeholder="Ryan Helmn"
                  disabled={submitting}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
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
                  autoComplete="new-password"
                  placeholder="At least 12 characters"
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
              Creating account…
            </>
          ) : (
            'Create account'
          )}
        </Button>
        <p className="text-sm text-muted-foreground text-center">
          Already have an account?{' '}
          <Link
            href={`/auth/sign-in${search.get('redirect') ? `?redirect=${encodeURIComponent(search.get('redirect')!)}` : ''}`}
            className="underline underline-offset-4"
          >
            Sign in
          </Link>
        </p>
      </form>
    </Form>
  )
}
