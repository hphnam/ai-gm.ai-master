'use client'

import { Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { PhoneOtpForm } from '@/components/auth/phone-otp-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { authClient } from '@/lib/auth-client'

type Preview = {
  inviteId: string
  orgName: string
  role: string
  phoneNumber: string
}

export function OnboardBody({ preview, autoCode }: { preview: Preview; autoCode?: string }) {
  const [step, setStep] = useState<'verify' | 'profile'>('verify')
  const [code, setCode] = useState(autoCode)
  const [codeResolved, setCodeResolved] = useState(false)

  // The PIN rides in the URL fragment so it never reaches server logs. Resolve
  // + scrub it before mounting the form — its auto-verify effect runs once on
  // mount. `?c=` still wins for links sent before the fragment change.
  useEffect(() => {
    const match = window.location.hash.match(/^#c=(\d{4,8})$/)
    if (match) {
      setCode((prev) => prev ?? match[1])
      window.history.replaceState(null, '', window.location.pathname + window.location.search)
    }
    setCodeResolved(true)
  }, [])

  if (step === 'profile') {
    return <ProfileStep orgName={preview.orgName} />
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold">Join {preview.orgName}</h1>
      <p className="mt-2 text-muted-foreground">
        You've been invited as a {preview.role}. We're confirming your number {preview.phoneNumber}{' '}
        to make sure it's you.
      </p>
      <div className="mt-6">
        {codeResolved ? (
          <PhoneOtpForm
            fixedPhone={preview.phoneNumber}
            autoCode={code}
            codeAlreadySent
            sendLabel="Text me a code"
            onVerified={() => setStep('profile')}
          />
        ) : (
          <div className="flex flex-col items-center gap-3 py-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
            <p className="text-sm">Confirming it's you…</p>
          </div>
        )}
      </div>
    </div>
  )
}

// Required name capture — the agent needs a real identity, otherwise User.name
// is just the phone number. Blocks entry to /chat until a name is saved.
function ProfileStep({ orgName }: { orgName: string }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [busy, setBusy] = useState(false)

  async function save() {
    const trimmed = name.trim()
    if (trimmed.length < 2) {
      toast.error('Enter your name so the team knows who you are.')
      return
    }
    setBusy(true)
    try {
      const { error } = await authClient.updateUser({ name: trimmed })
      if (error) {
        toast.error('Could not save your name. Please try again.')
        return
      }
      router.push('/chat')
      router.refresh()
    } catch {
      toast.error('Network error — please retry.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold">You're in — welcome to {orgName}</h1>
      <p className="mt-2 text-muted-foreground">What should the team call you?</p>
      <form
        className="mt-6 space-y-4"
        onSubmit={(e) => {
          e.preventDefault()
          void save()
        }}
        noValidate
      >
        <div className="space-y-2">
          <Label htmlFor="name">Your name</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="e.g. Sam Taylor"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={busy}
            autoFocus
          />
        </div>
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : 'Start using GM'}
        </Button>
      </form>
    </div>
  )
}
