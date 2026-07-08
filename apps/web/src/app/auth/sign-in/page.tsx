import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { SignInMethods } from '@/components/auth/sign-in-methods'
import { getServerSession } from '@/lib/server-session'

export const dynamic = 'force-dynamic'

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ method?: string }>
}) {
  const session = await getServerSession()
  if (session) redirect('/chat')
  const { method } = await searchParams
  return (
    <div className="space-y-5">
      <h2 className="text-center text-lg font-medium">Sign in</h2>
      <Suspense fallback={<div className="text-sm text-muted-foreground">Loading…</div>}>
        <SignInMethods initialMethod={method === 'phone' ? 'phone' : 'email'} />
      </Suspense>
    </div>
  )
}
