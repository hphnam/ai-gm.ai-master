import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getServerSession } from '@/lib/server-session'
import { VenueForm } from '@/components/venues/venue-form'

export const dynamic = 'force-dynamic'

export default async function NewVenuePage() {
  const session = await getServerSession()
  if (!session) redirect('/auth/sign-in?redirect=/venues/new')

  return (
    <main className="mx-auto max-w-lg p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-semibold">New venue</h1>
        <p className="text-sm text-muted-foreground">
          Venues scope knowledge, stock, and conversations. You can add more any time.
        </p>
      </header>
      <VenueForm />
      <footer className="pt-2 text-sm text-muted-foreground">
        <Link href="/chat" className="underline underline-offset-4 hover:text-foreground">
          Back to chat
        </Link>
      </footer>
    </main>
  )
}
