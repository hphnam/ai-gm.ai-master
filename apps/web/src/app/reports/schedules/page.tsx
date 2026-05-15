import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ScheduledReportsBody } from '@/components/scheduled-reports/scheduled-reports-body'
import { AppShell } from '@/components/shell/app-shell'
import { PageHeader } from '@/components/shell/page-header'
import { getServerSession } from '@/lib/server-session'

export const dynamic = 'force-dynamic'

export default async function ScheduledReportsPage() {
  const session = await getServerSession()
  if (!session) redirect('/auth/sign-in?redirect=/reports/schedules')
  return (
    <AppShell>
      <PageHeader
        title="Scheduled reports"
        description="Recurring reports that fire daily, weekly, or monthly. Each run sends a notification to your bell with a link to the report."
      />
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6">
          <div className="mb-4 flex items-center justify-end">
            <Link
              href="/reports"
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-foreground/80 transition-colors hover:bg-accent"
            >
              ← All reports
            </Link>
          </div>
          <ScheduledReportsBody />
        </div>
      </div>
    </AppShell>
  )
}
