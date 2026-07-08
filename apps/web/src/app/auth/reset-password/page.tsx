import { Suspense } from 'react'
import { ResetPasswordForm } from '@/components/auth/reset-password-form'

export const dynamic = 'force-dynamic'

export default function ResetPasswordPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-center text-lg font-medium">Choose a new password</h2>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <ResetPasswordForm />
      </Suspense>
    </div>
  )
}
