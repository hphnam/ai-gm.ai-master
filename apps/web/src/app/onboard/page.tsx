import { redirect } from 'next/navigation'
import { OnboardBody } from './onboard-body'

// 03-06 — WhatsApp signed-link invite landing.
// The manager creates an invite; we DM the invitee `<app>/onboard?t=<token>`.
// Token is HMAC-signed (no DB roundtrip to verify), but the invite row is the
// authoritative state. Preview fetch validates both.

export default async function OnboardPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string }>
}) {
  const params = await searchParams
  const token = params.t
  if (!token) redirect('/auth/sign-in')

  const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'
  const previewRes = await fetch(
    `${apiUrl}/whatsapp/invites/redeem/preview?t=${encodeURIComponent(token)}`,
    { cache: 'no-store' },
  )

  if (!previewRes.ok) {
    return (
      <div className="mx-auto max-w-md px-6 py-16">
        <h1 className="text-2xl font-semibold">Invite link is no longer valid</h1>
        <p className="mt-3 text-muted-foreground">
          The link may have expired or already been used. Ask your manager to resend.
        </p>
      </div>
    )
  }

  const preview = (await previewRes.json()) as {
    inviteId: string
    orgName: string
    role: string
  }

  return <OnboardBody token={token} preview={preview} />
}
