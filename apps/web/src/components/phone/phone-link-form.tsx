'use client'

import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
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
import type {
  SendPhoneCodeBodyDto as SendPhoneCodeBody,
  VerifyPhoneCodeBodyDto as VerifyPhoneCodeBody,
} from '@/generated/api'
import {
  PhoneControllerSendBody as SendPhoneCodeBodySchema,
  PhoneControllerVerifyBody as VerifyPhoneCodeBodySchema,
} from '@/generated/zod'
import { ApiError } from '@/lib/api-client'
import { maskPhone } from '@/lib/format'
import { useSendPhoneCode, useVerifyPhoneCode } from '@/lib/hooks/use-phone'
import { mapApiError } from '@/lib/map-api-error'

const RESEND_COOLDOWN_MS = 30_000

type Step =
  | { kind: 'enter-number' }
  | { kind: 'enter-code'; phoneNumber: string; lastSentAt: number }

export function PhoneLinkForm() {
  const [step, setStep] = useState<Step>({ kind: 'enter-number' })
  const [now, setNow] = useState(() => Date.now())
  const sendMutation = useSendPhoneCode()
  const verifyMutation = useVerifyPhoneCode()

  // Re-render every second while on the code step so the resend link enables after cooldown.
  if (step.kind === 'enter-code') {
    const remainingMs = step.lastSentAt + RESEND_COOLDOWN_MS - now
    if (remainingMs > 0) {
      setTimeout(() => setNow(Date.now()), 500)
    }
  }

  const numberForm = useForm<SendPhoneCodeBody>({
    resolver: zodResolver(SendPhoneCodeBodySchema),
    defaultValues: { phoneNumber: '' },
  })
  const codeForm = useForm<VerifyPhoneCodeBody>({
    resolver: zodResolver(VerifyPhoneCodeBodySchema),
    defaultValues: { phoneNumber: '', code: '' },
  })

  const onSendSubmit = numberForm.handleSubmit(async (values) => {
    try {
      await sendMutation.mutateAsync(values)
      setStep({
        kind: 'enter-code',
        phoneNumber: values.phoneNumber,
        lastSentAt: Date.now(),
      })
      codeForm.reset({ phoneNumber: values.phoneNumber, code: '' })
    } catch {
      /* toast handles user feedback */
    }
  })

  const onVerifySubmit = codeForm.handleSubmit(async (values) => {
    try {
      await verifyMutation.mutateAsync(values)
      // React Query invalidation flips the parent StatusCard to the linked view.
    } catch {
      /* toast handles user feedback */
    }
  })

  async function handleResend() {
    if (step.kind !== 'enter-code') return
    try {
      await sendMutation.mutateAsync({ phoneNumber: step.phoneNumber })
      setStep({ ...step, lastSentAt: Date.now() })
    } catch {
      /* toast handles user feedback */
    }
  }

  if (step.kind === 'enter-number') {
    const sendError =
      sendMutation.error instanceof ApiError ? mapApiError(sendMutation.error) : null
    return (
      <Form {...numberForm}>
        <form onSubmit={onSendSubmit} className="space-y-4">
          <FormField
            control={numberForm.control}
            name="phoneNumber"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Phone number</FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    autoComplete="tel"
                    inputMode="tel"
                    placeholder="+447700900123"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          {sendError ? (
            <p role="alert" className="text-sm text-destructive">
              {sendError}
            </p>
          ) : null}
          <Button type="submit" disabled={sendMutation.isPending}>
            {sendMutation.isPending ? 'Sending…' : 'Send code'}
          </Button>
        </form>
      </Form>
    )
  }

  const verifyError =
    verifyMutation.error instanceof ApiError ? mapApiError(verifyMutation.error) : null
  const remainingMs = step.lastSentAt + RESEND_COOLDOWN_MS - now
  const canResend = remainingMs <= 0 && !sendMutation.isPending
  const secondsLeft = Math.max(0, Math.ceil(remainingMs / 1000))

  return (
    <Form {...codeForm}>
      <form onSubmit={onVerifySubmit} className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Code sent to{' '}
          <span className="font-medium text-foreground">{maskPhone(step.phoneNumber)}</span>
        </p>
        <FormField
          control={codeForm.control}
          name="code"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Verification code</FormLabel>
              <FormControl>
                <Input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={12}
                  placeholder="123456"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {verifyError ? (
          <p role="alert" className="text-sm text-destructive">
            {verifyError}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={verifyMutation.isPending}>
            {verifyMutation.isPending ? 'Verifying…' : 'Verify'}
          </Button>
          <button
            type="button"
            onClick={() => {
              sendMutation.reset()
              verifyMutation.reset()
              setStep({ kind: 'enter-number' })
              numberForm.reset({ phoneNumber: '' })
            }}
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Change number
          </button>
          <button
            type="button"
            onClick={handleResend}
            disabled={!canResend}
            className="text-sm text-muted-foreground underline underline-offset-4 hover:text-foreground disabled:no-underline disabled:opacity-60"
          >
            {canResend ? 'Send code again' : `Send code again (${secondsLeft}s)`}
          </button>
        </div>
      </form>
    </Form>
  )
}
