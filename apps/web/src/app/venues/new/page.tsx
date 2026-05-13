import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AppShell } from '@/components/shell/app-shell'
import { PageHeader } from '@/components/shell/page-header'
import { Button } from '@/components/ui/button'
import { VenueForm } from '@/components/venues/venue-form'
import { getServerSession } from '@/lib/server-session'

export const dynamic = 'force-dynamic'

export default async function NewVenuePage() {
  const session = await getServerSession()
  if (!session) redirect('/auth/sign-in?redirect=/venues/new')

  return (
    <AppShell>
      <PageHeader
        title="New venue"
        description="Venues scope knowledge, stock, and conversations."
        actions={
          <Button variant="ghost" size="sm" asChild>
            <Link href="/chat">
              <ArrowLeft className="h-4 w-4" aria-hidden />
              Back to chat
            </Link>
          </Button>
        }
      />
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-lg px-4 py-6 sm:px-6">
          <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
            <VenueForm />
          </div>
        </div>
      </div>
    </AppShell>
  )
}
