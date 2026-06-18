import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { SignInForm } from '@/components/auth/sign-in-form'
import { getServerSession } from '@/lib/server-session'

export const dynamic = 'force-dynamic'

export default async function SignInPage() {
  const session = await getServerSession()
  if (session) redirect('/chat')
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-center">Sign in</h2>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <SignInForm />
      </Suspense>
    </div>
  )
}
