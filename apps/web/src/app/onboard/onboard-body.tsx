'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

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

export function OnboardBody({ token, preview }: { token: string; preview: Preview }) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
      const res = await fetch(`${apiUrl}/whatsapp/invites/redeem/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token, name }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string }
        setError(body.error ?? 'Redemption failed')
        return
      }
      router.push('/chat')
    } catch {
      setError('Network error — try again')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mx-auto max-w-md px-6 py-16">
      <h1 className="text-2xl font-semibold">Join {preview.orgName}</h1>
      <p className="mt-2 text-muted-foreground">
        You've been invited as a {preview.role}. Confirm your name to get started.
      </p>

      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Your name</span>
          <input
            type="text"
            required
            minLength={1}
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-1 w-full rounded-md border px-3 py-2"
            placeholder="Alex Smith"
          />
        </label>

        {error && (
          <p className="text-sm text-red-600" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || name.length === 0}
          className="w-full rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {submitting ? 'Joining…' : `Join ${preview.orgName}`}
        </button>
      </form>
    </div>
  )
}
