import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { SignUpForm } from '@/components/auth/sign-up-form'
import { getServerSession } from '@/lib/server-session'

export const dynamic = 'force-dynamic'

export default async function SignUpPage() {
  const session = await getServerSession()
  if (session) redirect('/chat')
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-medium text-center">Create an account</h2>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <SignUpForm />
      </Suspense>
    </div>
  )
}
