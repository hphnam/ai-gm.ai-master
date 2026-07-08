import { ScheduledReportsBody } from '@/components/scheduled-reports/scheduled-reports-body'
import { BackLink } from '@/components/ui/back-link'
import { PageContainer } from '@/components/ui/page-container'

export const dynamic = 'force-dynamic'

export default function ScheduledReportsPage() {
  return (
    <div className="scrollbar-thin flex-1 overflow-y-auto">
      <PageContainer width="prose">
        <BackLink href="/reports" className="mb-4">
          All reports
        </BackLink>
        <ScheduledReportsBody />
      </PageContainer>
    </div>
  )
}
