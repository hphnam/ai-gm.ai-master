import { ScheduledReportsBody } from '@/components/scheduled-reports/scheduled-reports-body'
import { AppShell } from '@/components/shell/app-shell'
import { PageHeader } from '@/components/shell/page-header'
import { BackLink } from '@/components/ui/back-link'

export const dynamic = 'force-dynamic'

export default function ScheduledReportsPage() {
  return (
    <AppShell>
      <PageHeader
        title="Scheduled reports"
        description="Recurring reports that fire daily, weekly, or monthly. Each run sends a notification to your bell with a link to the report."
      />
      <div className="scrollbar-thin flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:px-6 sm:py-8">
          <BackLink href="/reports" className="mb-4">
            All reports
          </BackLink>
          <ScheduledReportsBody />
        </div>
      </div>
    </AppShell>
  )
}
