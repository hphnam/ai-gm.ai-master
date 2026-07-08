import { CalendarClock } from 'lucide-react'
import Link from 'next/link'
import { PageHeaderView } from '@/components/shell/page-header'
import { Button } from '@/components/ui/button'

export default function ReportsHeader() {
  return (
    <PageHeaderView
      title="Reports"
      description="Saved reports the chat agent has generated for your org."
      actions={
        <Button asChild size="sm" variant="outline" className="cursor-pointer gap-1.5">
          <Link href="/reports/schedules">
            <CalendarClock className="h-3.5 w-3.5" aria-hidden />
            Scheduled reports
          </Link>
        </Button>
      }
    />
  )
}
