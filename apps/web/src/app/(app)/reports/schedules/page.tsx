import { ScheduledReportsBody } from '@/components/scheduled-reports/scheduled-reports-body'
import { PageContainer } from '@/components/ui/page-container'
import { ReportsViewSwitch } from '../reports-list-body'

export const dynamic = 'force-dynamic'

export default function ScheduledReportsPage() {
  return (
    <div className="scrollbar-thin flex-1 overflow-y-auto">
      <PageContainer width="prose">
        <ReportsViewSwitch active="schedules" />
        <ScheduledReportsBody />
      </PageContainer>
    </div>
  )
}
