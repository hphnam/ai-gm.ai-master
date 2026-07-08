import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { OnboardBody } from './onboard-body'

// The single-use PIN rides in the URL fragment (#c=, resolved client-side in
// OnboardBody); ?c= is still accepted for links sent before that change.
// no-referrer keeps token/PIN out of the Referer on any navigation from here.
export const metadata: Metadata = { referrer: 'no-referrer' }

export default async function OnboardPage({
  searchParams,
}: {
  searchParams: Promise<{ t?: string; c?: string }>
}) {
  const params = await searchParams
  const token = params.t
  const autoCode = typeof params.c === 'string' ? params.c : undefined
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
    phoneNumber: string
  }

  return <OnboardBody preview={preview} autoCode={autoCode} />
}
