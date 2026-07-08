import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { ForgotPasswordForm } from '@/components/auth/forgot-password-form'
import { getServerSession } from '@/lib/server-session'

export const dynamic = 'force-dynamic'

export default async function ForgotPasswordPage() {
  const session = await getServerSession()
  if (session) redirect('/chat')
  return (
    <div className="space-y-4">
      <h2 className="text-center text-lg font-medium">Reset your password</h2>
      <p className="text-center text-sm text-muted-foreground">
        Enter your email and we&apos;ll send you a reset link.
      </p>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <ForgotPasswordForm />
      </Suspense>
    </div>
  )
}
