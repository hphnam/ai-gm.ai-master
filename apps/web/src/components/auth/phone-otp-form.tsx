'use client'

import { REGEXP_ONLY_DIGITS } from 'input-otp'
import { Loader2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'
import { toE164 } from '@/lib/phone'

const OTP_LENGTH = 5

export function PhoneOtpForm({
  fixedPhone,
  onVerified,
  sendLabel = 'Send code',
  codeAlreadySent = false,
  autoCode,
}: {
  fixedPhone?: string
  onVerified: () => void
  sendLabel?: string
  // The code was already delivered out-of-band (e.g. in the invite SMS) — jump
  // straight to code entry and expose a resend control instead of re-sending.
  codeAlreadySent?: boolean
  // A code carried in the invite link — pre-fill and auto-verify on load. It's
  // stripped from the URL immediately (single-use) and the manual form is the
  // fallback if it's wrong/expired.
  autoCode?: string
}) {
  const [phone, setPhone] = useState(fixedPhone ?? '')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'phone' | 'code'>(
    codeAlreadySent && fixedPhone ? 'code' : 'phone',
  )
  const [busy, setBusy] = useState(false)
  const canAutoVerify = Boolean(autoCode && fixedPhone && codeAlreadySent)
  const [autoVerifying, setAutoVerifying] = useState(canAutoVerify)
  const autoTriedRef = useRef(false)

  async function requestCode(): Promise<boolean> {
    const normalized = toE164(phone)
    if (!normalized) {
      toast.error('Enter a valid mobile number, e.g. 07700 900000.')
      return false
    }
    // Pin the canonical +44… form into state so the later verify() call and the
    // "Sent to …" label both match what better-auth stored.
    if (normalized !== phone) setPhone(normalized)
    const { error } = await authClient.phoneNumber.sendOtp({ phoneNumber: normalized })
    if (error) {
      toast.error('Could not send the code. Check the number and try again.')
      return false
    }
    return true
  }

  async function sendCode() {
    setBusy(true)
    try {
      if (await requestCode()) setStep('code')
    } catch {
      toast.error('Network error — please retry.')
    } finally {
      setBusy(false)
    }
  }

  async function resendCode() {
    setBusy(true)
    try {
      if (await requestCode()) toast.success('Code sent.')
    } catch {
      toast.error('Network error — please retry.')
    } finally {
      setBusy(false)
    }
  }

  // `silent` suppresses failure toasts on the auto-verify path — a user who
  // just tapped a link shouldn't see an error before the manual form even
  // appears; we fall through to the pre-filled form instead.
  async function verify(codeArg?: string, opts?: { silent?: boolean }): Promise<boolean> {
    const candidate = (codeArg ?? code).trim()
    if (candidate.length !== OTP_LENGTH) {
      if (!opts?.silent) toast.error('Enter the 5-digit code we sent you.')
      return false
    }
    setBusy(true)
    try {
      const { error } = await authClient.phoneNumber.verify({
        phoneNumber: phone,
        code: candidate,
      })
      if (error) {
        if (!opts?.silent) toast.error('That code is incorrect or has expired.')
        return false
      }
      onVerified()
      return true
    } catch {
      toast.error('Network error — please retry.')
      return false
    } finally {
      setBusy(false)
    }
  }

  // Auto-verify a code carried in the invite link. Runs once; the ref guards
  // against React's dev double-invoke. The single-use PIN is scrubbed from the
  // URL before the request so it never lingers in history. On any failure we
  // drop to the manual form with the code pre-filled.
  useEffect(() => {
    if (autoTriedRef.current || !canAutoVerify || step !== 'code') return
    autoTriedRef.current = true
    if (typeof window !== 'undefined') {
      const url = new URL(window.location.href)
      if (url.searchParams.has('c')) {
        url.searchParams.delete('c')
        window.history.replaceState(null, '', url.pathname + url.search)
      }
    }
    const candidate = (autoCode ?? '').trim()
    setCode(candidate)
    if (candidate.length !== OTP_LENGTH) {
      setAutoVerifying(false)
      return
    }
    void verify(candidate, { silent: true }).then((ok) => {
      if (!ok) setAutoVerifying(false)
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (autoVerifying) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
        <p className="text-sm">Confirming it's you…</p>
      </div>
    )
  }

  if (step === 'phone') {
    return (
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void sendCode()
        }}
        noValidate
      >
        <div className="space-y-2">
          <Label htmlFor="phone">Mobile number</Label>
          <Input
            id="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            placeholder="07700 900000"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            disabled={busy || !!fixedPhone}
          />
          <p className="text-xs text-muted-foreground">
            UK mobile — start with 0. For an overseas number, add its + country code.
          </p>
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : sendLabel}
        </Button>
      </form>
    )
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        void verify()
      }}
      noValidate
    >
      <div className="space-y-2">
        <Label htmlFor="code">Enter the code</Label>
        <InputOTP
          id="code"
          maxLength={OTP_LENGTH}
          pattern={REGEXP_ONLY_DIGITS}
          value={code}
          onChange={setCode}
          disabled={busy}
          autoFocus
          containerClassName="justify-center"
        >
          <InputOTPGroup>
            {Array.from({ length: OTP_LENGTH }, (_, i) => (
              <InputOTPSlot key={i} index={i} />
            ))}
          </InputOTPGroup>
        </InputOTP>
        <p className="text-center text-xs text-muted-foreground">Sent to {phone}.</p>
      </div>
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : 'Verify & continue'}
      </Button>
      <button
        type="button"
        className="w-full text-center text-sm text-muted-foreground underline underline-offset-4"
        onClick={() => void resendCode()}
        disabled={busy}
      >
        Resend code
      </button>
      {fixedPhone ? null : (
        <button
          type="button"
          className="w-full text-center text-sm text-muted-foreground underline underline-offset-4"
          onClick={() => setStep('phone')}
          disabled={busy}
        >
          Use a different number
        </button>
      )}
    </form>
  )
}
