import { Suspense } from 'react'
import { Skeleton } from '@/components/ui/skeleton'
import { AcceptInvitationBody } from './accept-invitation-body'

export default async function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return (
    <Suspense
      fallback={
        <div className="mx-auto mt-16 max-w-md space-y-3">
          <Skeleton className="h-24 w-full" />
        </div>
      }
    >
      <AcceptInvitationBody id={id} />
    </Suspense>
  )
}
