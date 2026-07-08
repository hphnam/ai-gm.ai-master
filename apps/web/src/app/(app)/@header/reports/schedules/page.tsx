import { PageHeaderView } from '@/components/shell/page-header'

export default function ReportSchedulesHeader() {
  return (
    <PageHeaderView
      title="Scheduled reports"
      description="Recurring reports that fire daily, weekly, or monthly. Each run sends a notification to your bell with a link to the report."
    />
  )
}
