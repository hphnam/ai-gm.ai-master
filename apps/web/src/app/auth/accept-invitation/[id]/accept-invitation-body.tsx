'use client'

import { Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { authClient, useSession } from '@/lib/auth-client'
import { useAcceptInvitation, useInvitationPreview } from '@/lib/hooks/use-invitations'
import { isTerminalInvitationError, mapApiError } from '@/lib/map-api-error'
import { isSafeRedirect } from '@/lib/safe-redirect'

export function AcceptInvitationBody({ id }: { id: string }) {
  const router = useRouter()
  const preview = useInvitationPreview(id)
  const { data: session, isPending: sessionPending } = useSession()
  const accept = useAcceptInvitation()
  const triedRef = useRef(false)

  const isSignedIn = !!session?.user
  const currentEmail = session?.user?.email ?? null

  // Auto-accept when signed in with a matching email (S6: guard against React 19 strict-mode double-effect)
  useEffect(() => {
    if (triedRef.current) return
    if (!preview.data) return
    if (sessionPending) return
    if (!isSignedIn) return
    if (accept.isPending) return
    // masked preview email starts with first 2 chars of invite email + '***@domain'
    // the server will reject mismatches with invitation-email-mismatch, so we just try
    triedRef.current = true
    accept
      .mutateAsync(id)
      .then(() => {
        router.replace('/chat')
      })
      .catch(() => {
        /* rendered below */
      })
  }, [preview.data, sessionPending, isSignedIn, accept, id, router])

  // --- RENDER ---

  if (preview.isLoading) {
    return (
      <Wrapper>
        <Skeleton className="h-24 w-full" />
      </Wrapper>
    )
  }

  if (preview.isError) {
    return (
      <Wrapper>
        <h1 className="text-lg font-semibold">This invitation isn&apos;t available</h1>
        <p className="mt-2 text-sm text-muted-foreground">{mapApiError(preview.error)}</p>
        <Link href="/chat" className="mt-4 inline-block text-sm underline">
          Back to GM AI
        </Link>
      </Wrapper>
    )
  }

  if (!preview.data) return null

  const invPreview = preview.data

  // Signed out — show preview + sign-in CTA
  if (!isSignedIn) {
    const target = `/auth/accept-invitation/${id}`
    const safeTarget = isSafeRedirect(target) ? target : '/chat'
    const href = `/auth/sign-in?redirect=${encodeURIComponent(safeTarget)}`
    return (
      <Wrapper>
        <h1 className="text-lg font-semibold">
          You&apos;ve been invited to {invPreview.organizationName}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Role: <span className="font-medium">{invPreview.role}</span>
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Sign in (or sign up) with <span className="font-medium">{invPreview.email}</span> to
          accept.
        </p>
        <div className="mt-4">
          <Button asChild>
            <Link href={href}>Sign in to accept</Link>
          </Button>
        </div>
      </Wrapper>
    )
  }

  // Signed in — check for email mismatch client-side (masked email comparison is imperfect,
  // but the server enforces the authoritative check)
  if (currentEmail && !emailMatchesMask(currentEmail, invPreview.email)) {
    return (
      <Wrapper>
        <h1 className="text-lg font-semibold">This invitation is for a different email</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This invitation is for <span className="font-medium">{invPreview.email}</span>, but
          you&apos;re signed in as <span className="font-medium">{currentEmail}</span>.
        </p>
        <div className="mt-4 flex gap-2">
          <Button
            variant="outline"
            onClick={async () => {
              await authClient.signOut().catch(() => undefined)
              router.replace(
                `/auth/sign-in?redirect=${encodeURIComponent(`/auth/accept-invitation/${id}`)}`,
              )
            }}
          >
            Sign out and try again
          </Button>
        </div>
      </Wrapper>
    )
  }

  // Auto-accept state
  if (accept.isPending) {
    return (
      <Wrapper>
        <div className="flex items-center gap-2 text-sm">
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
          Accepting invitation…
        </div>
      </Wrapper>
    )
  }

  if (accept.isError) {
    const terminal = isTerminalInvitationError(accept.error)
    return (
      <Wrapper>
        <h1 className="text-lg font-semibold">Couldn&apos;t accept this invitation</h1>
        <p className="mt-2 text-sm text-muted-foreground">{mapApiError(accept.error)}</p>
        <div className="mt-4 flex gap-2">
          {!terminal && (
            <Button
              onClick={() => {
                triedRef.current = false
                accept.reset()
              }}
            >
              Try again
            </Button>
          )}
          <Link href="/chat" className="text-sm underline self-center">
            Back to GM AI
          </Link>
        </div>
      </Wrapper>
    )
  }

  return (
    <Wrapper>
      <div className="flex items-center gap-2 text-sm">
        <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        Accepting invitation…
      </div>
    </Wrapper>
  )
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto mt-16 max-w-md rounded-lg border bg-background p-6">{children}</div>
  )
}

// The preview email is masked ("jo***@example.com"). We can only verify the domain
// and the first 2 chars match — enough to give the user a better client-side hint
// than nothing. Server is authoritative via invitation-email-mismatch.
function emailMatchesMask(current: string, masked: string): boolean {
  const [currLocal, currDomain] = current.toLowerCase().split('@')
  const [maskLocal, maskDomain] = masked.toLowerCase().split('@')
  if (!currDomain || !maskDomain) return false
  if (currDomain !== maskDomain) return false
  // maskLocal is like "jo***"
  const prefix = maskLocal.replace(/\*+$/, '')
  if (!prefix) return true // no visible prefix to compare
  return currLocal.startsWith(prefix)
}
