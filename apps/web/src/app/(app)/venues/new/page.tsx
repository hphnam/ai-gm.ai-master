import { redirect } from 'next/navigation'
import { BackLink } from '@/components/ui/back-link'
import { PageContainer } from '@/components/ui/page-container'
import { VenueForm } from '@/components/venues/venue-form'
import { getServerSession, isManagerRole } from '@/lib/server-session'

export const dynamic = 'force-dynamic'

export default async function NewVenuePage() {
  const session = await getServerSession()
  if (!session) redirect('/auth/sign-in?redirect=/venues/new')
  if (!isManagerRole(session.membership?.role)) redirect('/chat')

  return (
    <div className="scrollbar-thin flex-1 overflow-y-auto">
      <PageContainer width="prose">
        <div className="mx-auto w-full max-w-lg">
          <BackLink href="/chat" className="mb-4">
            Back to chat
          </BackLink>
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <VenueForm />
          </div>
        </div>
      </PageContainer>
    </div>
  )
}
